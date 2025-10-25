from typing_extensions import Annotated
from pydantic import BaseModel, ConfigDict
from pydantic.functional_validators import AfterValidator, BeforeValidator
from datetime import timedelta
from pandas import Timedelta


def to_timedelta(x):
    return Timedelta(x).to_pytimedelta()


TimeDelta = Annotated[
    timedelta,
    BeforeValidator(to_timedelta),
]


class TVTrackBaseModel(BaseModel):
    model_config = ConfigDict(
        validate_default=True
    )
