import subprocess
import json
from utils.timer import Timer
from utils.context import Context
from schema.config import Config


class Smart:
    @staticmethod
    def get_all_device(type=["scsi", "nvme"]):
        result = subprocess.run(
            ['sudo', 'smartctl', '--scan', '--json'], capture_output=True, text=True, check=True)
        output = result.stdout
        data = json.loads(output)
        devices = []
        for device in data["devices"]:
            if device["type"] in type:
                devices.append(device["name"])
        return devices

    @staticmethod
    def get_device_attributes(device):
        result = subprocess.run(
            ['sudo', 'smartctl', '--attributes', '--json', device], capture_output=True, text=True, check=True)
        output = result.stdout
        data = json.loads(output)
        attributes = data["ata_smart_attributes"]["table"]

        def parse_attribute(attr):
            return {
                "raw_value": attr["raw"]["value"],
            }
        return {attr["id"]: parse_attribute(attr) for attr in attributes}

    @staticmethod
    def get_device_error(device):
        result = subprocess.run(
            ['sudo', 'smartctl', '-a', '--quietmode=errorsonly', device], capture_output=True, text=True, check=True)
        output = result.stdout
        return output

    _ERROR_ATTR = [5, 187, 188, 197, 198]

    @staticmethod
    def check_device(device):
        attr = Smart.get_device_attributes(device)
        for error_attr in Smart._ERROR_ATTR:
            if attr[error_attr]["raw_value"] != 0:
                raise ValueError(f"device {device} error attr {error_attr}")
        device_error = Smart.get_device_error(device)
        if device_error != "":
            raise ValueError(f"device {device} error {device_error}")


class SmartMonitor:
    def __init__(self, config: Config):
        self.timer = Timer(
            self.check, config.monitor.check_smart_interval.total_seconds())

    async def start(self):
        await self.timer.start()

    async def stop(self):
        await self.timer.stop()

    async def check(self):
        with Context.handle_error_context("smart monitor check error", type="critical"):
            devices = Smart.get_all_device(["scsi"])
            for device in devices:
                with Context.handle_error_context(f"check device {device} error", type="critical"):
                    Smart.check_device(device)


if __name__ == "__main__":
    import asyncio
    from utils.context import Context
    from pathlib import Path
    from schema.config import Config
    import sys

    config = Config.model_validate_json(
        open(Path(__file__).parent.parent / "config.json").read())

    async def run():
        smart_monitor = SmartMonitor(config)
        async with Context() as ctx:
            await smart_monitor.check()
    asyncio.run(run())
