from aiohttp import web


def api(func):
    func.__api__ = True
    return func


def mock(func):
    func.__mock__ = True
    return func


def _wrap(func):
    request_type = func.__annotations__["request"]

    async def wrapper(request):
        text = await request.text()
        request = request_type.model_validate_json(text)
        return web.json_response(text=(await func(request)).model_dump_json())
    return wrapper


def create_routes(api_handler, mock=False):
    routes = []
    api = {}
    mock_api = {}
    for name, func in api_handler.__class__.__dict__.items():
        if hasattr(func, "__api__"):
            api[name] = getattr(api_handler, name)
        if name.startswith("mock_") and hasattr(func, "__mock__"):
            mock_api[name[5:]] = getattr(api_handler, name)
    for name, func in api.items():
        if mock and name in mock_api:
            routes.append(
                web.post(f"/api/{name}", _wrap(mock_api[name])))
        else:
            routes.append(
                web.post(f"/api/{name}", _wrap(func)))
    return routes
