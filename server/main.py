from aiohttp import web
from aiohttp_basicauth import BasicAuthMiddleware
from app import run_app
from service.web_handler import web_routes
from schema.config import Config
from tracker.tracker_main import Tracker
import os
import sys
from service.api_service import create_routes
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--mock", default=False,
                    action='store_true', help="enable mock api")
parser.add_argument("--config", default="config.json", help="config file path")
args = parser.parse_args()

config = Config.model_validate_json(open(args.config).read())

tracker = Tracker(config)

if config.service.auth_username and config.service.auth_password:
    auth = BasicAuthMiddleware(
        username=config.service.auth_username, password=config.service.auth_password)
    app = web.Application(middlewares=[auth])
else:
    app = web.Application()
app.add_routes(create_routes(tracker, mock=args.mock))
app.add_routes([web.static('/resource', config.tracker.resource_dir)])
app.add_routes(web_routes(
    '/', os.path.join(os.path.dirname(__file__), '../web/dist'), 'index.html'))

run_app(app, config.service.port, tracker.start, tracker.save)
