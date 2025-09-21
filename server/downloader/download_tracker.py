import time
import datetime


def _human_readable_size(byte_count):
    if byte_count < 1024:
        return f"{byte_count:.2f} B"
    elif byte_count < 1024 * 1024:
        return f"{byte_count / 1024:.2f} KB"
    elif byte_count < 1024 * 1024 * 1024:
        return f"{byte_count / 1024 / 1024:.2f} MB"
    else:
        return f"{byte_count / 1024 / 1024 / 1024:.2f} GB"


def _human_readable_eta(eta):
    return str(datetime.timedelta(seconds=int(eta)))


class SpeedTracker:
    def __init__(self):
        self._records = []
        self._window_size = 60

    def add_bytes_downloaded(self, bytes_downloaded):
        current_time = time.time()
        self._records.append((current_time, bytes_downloaded))
        self._clean_old_records()

    def human_readable_speed(self):
        self._clean_old_records()
        if not self._records:
            return "0 B/s"

        if len(self._records) == 1:
            return f"<{_human_readable_size(self._records[0][1] / self._window_size)}/s"

        total_bytes = sum(record[1] for record in self._records[1:])
        time_span = self._records[-1][0] - self._records[0][0]

        return f"{_human_readable_size(total_bytes / time_span)}/s"

    def _clean_old_records(self):
        current_time = time.time()
        cutoff_time = current_time - self._window_size
        while self._records and self._records[0][0] < cutoff_time:
            self._records.pop(0)

    def speed(self):
        self._clean_old_records()
        if not self._records:
            return 0

        if len(self._records) == 1:
            return self._records[0][1] / self._window_size

        total_bytes = sum(record[1] for record in self._records[1:])
        time_span = self._records[-1][0] - self._records[0][0]

        return total_bytes / time_span


class SizeTracker:
    def __init__(self, fragment_count):
        self._fragments = []
        self._fragment_count = fragment_count
        self._fragment_downloaded = 0

    def add_fragment(self, fragment_bytes):
        if self._fragments:
            self._fragments[-1] = self._fragment_downloaded
        self._fragments.append(fragment_bytes)
        self._fragment_downloaded = 0

    def add_bytes_downloaded(self, bytes_downloaded):
        self._fragment_downloaded += bytes_downloaded

    def total_size(self):
        if len(self._fragments) == 0:
            return None
        if self._fragments[-1] is None:
            if len(self._fragments) > 1:
                return self._fragment_count * sum(self._fragments[:-1]) / (len(self._fragments) - 1)
            else:
                return None
        return self._fragment_count * sum(self._fragments) / len(self._fragments)

    def total_downloaded(self):
        return sum(self._fragments[:-1]) + self._fragment_downloaded

    def remain_size(self):
        total_size = self.total_size()
        if total_size is None:
            return None
        return total_size - self.total_downloaded()

    def is_expected_size(self):
        return self._fragment_count > len(self._fragments) or self._fragments[-1] is None

    def human_readable_size(self):
        if len(self._fragments) == 0:
            return f"0 / Nan 0%"
        total_size = self.total_size()
        total_downloaded = self.total_downloaded()
        is_expected_size = self.is_expected_size()
        if total_size is None:
            return f"{_human_readable_size(total_downloaded)} / Nan Nan%"
        return f"{_human_readable_size(total_downloaded)} / {_human_readable_size(total_size)} " \
            f"({total_downloaded/total_size*100:.2f}%)" \
            f"{' (expected)' if is_expected_size else ''}"


class DownloadTracker:
    def __init__(self, fragment_count):
        self._speed_tracker = SpeedTracker()
        self._size_tracker = SizeTracker(fragment_count)

    def add_fragment(self, fragment_bytes):
        self._size_tracker.add_fragment(fragment_bytes)

    def add_bytes_downloaded(self, bytes_downloaded):
        self._speed_tracker.add_bytes_downloaded(bytes_downloaded)
        self._size_tracker.add_bytes_downloaded(bytes_downloaded)

    def human_readable_speed(self):
        return self._speed_tracker.human_readable_speed()

    def human_readable_size(self):
        return self._size_tracker.human_readable_size()

    def human_readable_eta(self):
        remain_size = self._size_tracker.remain_size()
        if remain_size is None:
            return "Nan"
        speed = self._speed_tracker.speed()
        if speed == 0:
            return "Inf"
        return _human_readable_eta(remain_size / speed)

    def human_readable_status(self):
        return f"Speed: {self.human_readable_speed()} Downloaded: {self.human_readable_size()} ETA: {self.human_readable_eta()}"


if __name__ == "__main__":
    tracker = DownloadTracker(1)
    tracker.add_fragment(1000)
    tracker.add_bytes_downloaded(100)
    print(tracker.human_readable_status())
    time.sleep(1)
    tracker.add_bytes_downloaded(100)
    print(tracker.human_readable_status())
    time.sleep(1)
    tracker.add_bytes_downloaded(100)
    print(tracker.human_readable_status())
