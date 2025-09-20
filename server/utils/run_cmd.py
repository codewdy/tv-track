import asyncio


async def run_cmd(*cmd):
    proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
    await proc.wait()
    if proc.returncode != 0:
        raise ValueError(f"cmd {cmd} failed")
