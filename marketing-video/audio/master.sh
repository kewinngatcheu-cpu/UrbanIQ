#!/usr/bin/env bash
# Linear loudness normalisation to -14 LUFS (keeps the dynamic arc intact) + true-peak safety limiter.
set -e
cd "$(dirname "$0")"
I=$(ffmpeg -hide_banner -nostats -i soundtrack_raw.wav -af ebur128 -f null - 2>&1 | awk '/Integrated loudness/{f=1} f&&/I:/{print $2; exit}')
GAIN=$(python3 -c "print(round(-14 - ($I), 2))")
echo "measured $I LUFS → gain $GAIN dB"
ffmpeg -hide_banner -loglevel error -y -i soundtrack_raw.wav -af "volume=${GAIN}dB,alimiter=limit=0.87:attack=1:release=60:level=false,aresample=48000" soundtrack.wav
ffmpeg -hide_banner -nostats -i soundtrack.wav -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):" | tail -2
