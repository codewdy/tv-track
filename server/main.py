from aiohttp import web
from aiohttp_basicauth import BasicAuthMiddleware
from service.web_handler import web_routes
import os

auth = BasicAuthMiddleware(username='user', password='password')
app = web.Application(middlewares=[auth])
app.add_routes(web_routes(
    '/', os.path.join(os.path.dirname(__file__), '../web/dist'), 'index.html'))
web.run_app(app, port=8080)
