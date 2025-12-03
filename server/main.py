from aiohttp import web
from aiohttp_basicauth import BasicAuthMiddleware
from app import run_app
from service.web_handler import web_routes
from schema.config import Config
from tracker.tracker_main import Tracker
import os
import sys
from service.api_service import create_routes
from service.audio_handler import audio_routes
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--mock", default=False,
                    action='store_true', help="enable mock api")
parser.add_argument("--config", default="config.json", help="config file path")
args = parser.parse_args()

config = Config.model_validate_json(open(args.config).read())

abs_path = os.path.abspath(args.config)
config.tracker.resource_dir = os.path.join(
    os.path.dirname(abs_path), config.tracker.resource_dir)
if config.logger.filename:
    config.logger.filename = os.path.join(
        os.path.dirname(abs_path), config.logger.filename)

tracker = Tracker(config)

@web.middleware
async def cors_middleware(request, handler):
    if request.method == 'OPTIONS':
        response = web.Response()
    else:
        response = await handler(request)
    
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS, PUT, DELETE'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

middlewares = [cors_middleware]

if config.service.auth_username and config.service.auth_password:
    auth = BasicAuthMiddleware(
        username=config.service.auth_username, password=config.service.auth_password)
    middlewares.append(auth)

app = web.Application(middlewares=middlewares)
app.add_routes(create_routes(tracker, mock=args.mock))
app.add_routes(audio_routes(
    '/audio', config.tracker.resource_dir, tracker))
app.add_routes([web.static('/resource', config.tracker.resource_dir)])
app.add_routes(web_routes(
    '/', os.path.join(os.path.dirname(__file__), '../web/dist'), 'index.html'))

run_app(app, config.service.port, tracker.start, tracker.sync_stop)
