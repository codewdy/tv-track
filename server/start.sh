#!/bin/bash
MY_PATH="$(dirname -- "${BASH_SOURCE[0]}")"
cd $MY_PATH
source ~/miniconda3/bin/activate base 
python main.py $*
conda deactivate