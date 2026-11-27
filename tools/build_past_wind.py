"""Original gusting wind, reproducible without downloaded recordings.

24-second mono Ogg stream, restrained under the existing music. NumPy and
FFmpeg are build-time tools only; no additional client runtime or experiments.
"""
from pathlib import Path
import json, shutil, subprocess, tempfile, wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
RP=ROOT/'packs/resource_packs/WARLAND_UmbralLoading_RP'

def build():
    rate=24000;seconds=24;count=rate*seconds
    t=np.arange(count)/rate;rng=np.random.default_rng(271126)
    freq=np.fft.rfftfreq(count,1/rate)
    def air(low,high):
        weight=(1-np.exp(-(freq/low)**4))*np.exp(-(freq/high)**2)/np.sqrt(np.maximum(freq,20))
        v=np.fft.irfft(np.fft.rfft(rng.normal(size=count))*weight,n=count)
        return v/max(np.std(v),1e-9)
    gust=.6+.18*np.sin(2*np.pi*t/8+.4)+.12*np.sin(2*np.pi*t/3.7)
    # Low body plus dry granular air; no tonal whistle or impact transients.
    signal=(.52*air(50,330)+.23*air(260,2400))*gust
    signal*=np.minimum(t/.35,1)*np.clip((seconds-t)/.45,0,1)
    signal=np.tanh(signal*.65)
    signal*=.7/max(np.max(np.abs(signal)),1e-9)
    output=RP/'sounds/warland/past_wind.ogg';output.parent.mkdir(parents=True,exist_ok=True)
    ffmpeg=shutil.which('ffmpeg')
    if not ffmpeg:raise RuntimeError('FFmpeg is required')
    with tempfile.TemporaryDirectory(prefix='warland-past-wind-') as tmp:
        wav=Path(tmp)/'wind.wav'
        with wave.open(str(wav),'wb') as f:
            f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes((signal*32767).astype('<i2').tobytes())
        subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-i',str(wav),'-af','loudnorm=I=-20:TP=-3:LRA=5','-ar',str(rate),'-c:a','libvorbis','-q:a','3',str(output)],check=True)
    path=RP/'sounds/sound_definitions.json';d=json.loads(path.read_text(encoding='utf-8'))
    d['sound_definitions']['warland.past.wind']={'category':'weather','sounds':[{'name':'sounds/warland/past_wind','stream':True,'is3D':False,'volume':1}]}
    path.write_text(json.dumps(d,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'file':str(output),'durationSeconds':seconds,'bytes':output.stat().st_size,'originalSynthesis':True}))

if __name__=='__main__':build()
