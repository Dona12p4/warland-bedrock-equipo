"""Original short wind sound: low rumble, rising air, soft descending tail.

Requires NumPy and FFmpeg only when regenerating this committed Ogg asset.
No microphone, recording application, downloaded audio or global mixer changes.
"""
from pathlib import Path
import json, shutil, subprocess, tempfile, wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
RP=ROOT/'packs/resource_packs/WARLAND_Lobby_RP'
timeline=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {ARRIVAL} from './packs/behavior_packs/WARLAND_Lobby_BP/scripts/arrival-policy.js';console.log(JSON.stringify(ARRIVAL))"],cwd=ROOT,text=True))
peak=timeline['descent']/20
rate=24000; duration=peak+2.8; count=round(rate*duration)
t=np.arange(count)/rate; rng=np.random.default_rng(261126)
freq=np.fft.rfftfreq(count,1/rate)

def air(low,high):
    spectrum=np.fft.rfft(rng.normal(size=count))
    weight=(1-np.exp(-(freq/low)**4))*np.exp(-(freq/high)**2)/np.sqrt(np.maximum(freq,20))
    result=np.fft.irfft(spectrum*weight,n=count)
    return result/max(np.std(result),1e-9)

rise=np.clip(t/peak,0,1)
fall=np.clip((duration-t)/(duration-peak),0,1)
envelope=np.where(t<peak,rise**1.65,fall**2.1)
gust=.91+.055*np.sin(2*np.pi*.7*t)+.035*np.sin(2*np.pi*1.37*t+.4)
# Broadband wind rather than a sustained musical note; low body is accompanied
# by a brighter layer which grows on the approach to the descent cue.
signal=(.62*air(42,270)+(.12+.27*rise)*air(240,2100))*envelope*gust
signal+=.07*air(28,95)*np.exp(-((t-peak)/.38)**2)
signal*=np.minimum(t/.12,1)*np.clip((duration-t)/.2,0,1)
signal=np.tanh(signal*.75)
signal*=.72/max(np.max(np.abs(signal)),1e-9)
output=RP/'sounds/arrival/wind.ogg';output.parent.mkdir(parents=True,exist_ok=True)
ffmpeg=shutil.which('ffmpeg')
if not ffmpeg:raise RuntimeError('FFmpeg is required to regenerate the sound')
with tempfile.TemporaryDirectory(prefix='warland-arrival-wind-') as temporary:
    source=Path(temporary)/'wind.wav'
    with wave.open(str(source),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate)
        f.writeframes((signal*32767).astype('<i2').tobytes())
    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-i',str(source),'-c:a','libvorbis','-q:a','4',str(output)],check=True)
definitions={'format_version':'1.14.0','sound_definitions':{'warland.arrival.wind':{'category':'weather','sounds':[{'name':'sounds/arrival/wind','stream':False,'is3D':False,'volume':1}]}}}
(RP/'sounds/sound_definitions.json').write_text(json.dumps(definitions,indent=2)+'\n',encoding='utf8')
window=rate//4
rms=[float(np.sqrt(np.mean(signal[i:i+window]**2))) for i in range(0,count-window,window)]
peak_rms_time=(int(np.argmax(rms))+.5)*.25
assert abs(peak_rms_time-peak)<.5
print(json.dumps({'duration':duration,'peakCue':peak,'peakRmsTime':peak_rms_time,'sampleRate':rate,'bytes':output.stat().st_size,'maxAmplitude':float(np.max(abs(signal)))}))
