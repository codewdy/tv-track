import asyncio
import av
import dataclasses
import hashlib
from utils.context import Context


@dataclasses.dataclass
class TSFingerPrint:
    md5: str = ""
    time_base: int = 0
    duration: int = 0
    width: int = 0
    height: int = 0
    filtered: bool = False
    parse_error: bool = False

    def finger_print_tuple(self):
        return self.time_base, self.duration, self.width, self.height


class M3U8AdBlocker:

    async def process_lines(self, lines):
        db_manager = Context.get_meta("db_manager")
        lines = list(lines)
        ts = []
        for i, line in enumerate(lines):
            if line.startswith("#"):
                continue
            ts.append(i)

        loop = asyncio.get_running_loop()
        finger_prints = await loop.run_in_executor(None, self.get_finger_prints, [lines[t].strip() for t in ts])

        finger_print_count = {}
        for fp in finger_prints:
            if fp.parse_error:
                continue
            if fp.finger_print_tuple() not in finger_print_count:
                finger_print_count[fp.finger_print_tuple()] = 0
            finger_print_count[fp.finger_print_tuple()] += 1

        main_finger_print = max(finger_print_count, key=finger_print_count.get)

        if db_manager is not None:
            ts_black_list = db_manager.ad_block().ts_black_list
            for t, fp in zip(ts, finger_prints):
                if fp.parse_error:
                    continue
                if fp.md5 in ts_black_list:
                    lines[t] = "#" + lines[t]
                    fp.filtered = True
                if fp.finger_print_tuple() != main_finger_print and str(t) not in ts_black_list:
                    lines[t] = "#" + lines[t]
                    fp.filtered = True
                    ts_black_list.add(fp.md5)
                    db_manager.ad_block_dirty()
        else:
            for t, fp in zip(ts, finger_prints):
                if fp.parse_error:
                    continue
                if fp.finger_print_tuple() != main_finger_print:
                    lines[t] = "#" + lines[t]
                    fp.filtered = True

        first_ts = None
        last_ts = None
        for t, fp in zip(ts, finger_prints):
            if fp.filtered:
                continue
            if first_ts is None:
                first_ts = t
            last_ts = t

        for t, fp in zip(ts, finger_prints):
            if fp.parse_error:
                if t == first_ts or t == last_ts:
                    lines[t] = "#" + lines[t]
                    fp.filtered = True
                else:
                    raise ValueError(
                        f"parse error ts {t} is not first or last ts.")

        return lines

    async def process_file(self, file):
        with open(file, "r") as f:
            lines = f.readlines()
        lines = await self.process_lines(lines)
        with open(file, "w") as f:
            f.writelines(lines)

    def get_finger_prints(self, files):
        return [self.get_finger_print(file) for file in files]

    def get_finger_print(self, file):
        rst = TSFingerPrint()
        try:
            avfile = av.open(file)
            with avfile as container:
                in_stream = container.streams.video[0]
                for packet in container.demux(in_stream):
                    if packet.dts is None:
                        continue
                    rst.time_base = int(1 / in_stream.time_base)
                    rst.duration = packet.duration
                    rst.width = in_stream.codec_context.width
                    rst.height = in_stream.codec_context.height
                    break
            rst.md5 = hashlib.md5(open(file, "rb").read()).hexdigest()
            return rst
        except:
            rst.parse_error = True
            return rst


if __name__ == "__main__":
    import asyncio
    import sys

    async def test():
        async with Context() as ctx:
            blocker = M3U8AdBlocker()
            await blocker.process_file(sys.argv[-1])
    asyncio.run(test())
