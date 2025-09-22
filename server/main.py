from aiohttp import web
from aiohttp_basicauth import BasicAuthMiddleware
from app import run_app
from service.web_handler import web_routes
from schema.config import Config
from tracker.tracker_main import Tracker
import os
import sys

config = Config.model_validate_json(open(sys.argv[-1]).read())

tracker = Tracker(config)
auth = BasicAuthMiddleware(username='user', password='password')
app = web.Application()
app.add_routes(web_routes(
    '/', os.path.join(os.path.dirname(__file__), '../web/dist'), 'index.html'))

run_app(tracker, app, config.tracker.port)
