"""Reproducible music cues and HUD fixes for the native two-act cut."""
from pathlib import Path
import json, subprocess
import numpy as np
from scipy.signal import butter, sosfiltfilt, find_peaks
R=Path(__file__).resolve().parents[1]; P=R.parents[1]
RP=R/'packs/resource_packs/WARLAND_UmbralLoading_RP'
SOURCE=P/'outputs/WARLAND1-Memoria-IV/Mundo-reconstruido'
def write(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def build():
    out=R/'.local/past-two-acts';out.mkdir(exist_ok=True)
    src=SOURCE/'Ceniza-integrada/fondo-void.webm'
    a=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(src),'-t','64','-ar','4000','-ac','1','-f','f32le','-']),dtype='<f4')
    bass=sosfiltfilt(butter(4,[35,180],fs=4000,btype='bandpass',output='sos'),a)
    rms=np.sqrt(np.mean(bass[:len(bass)//40*40].reshape(-1,40)**2,axis=1))
    env=np.convolve(rms,np.ones(5)/5,'same'); flux=np.maximum(0,env-np.roll(env,8))
    peaks,_=find_peaks(flux,distance=100,prominence=.02)
    cues=[13+23/30,20+19/30,27.5,34+17/30,39+23/30,44+19/30]
    selected=[]
    for cue in cues:
        i=min(peaks,key=lambda p:abs(p*.01-cue))
        assert abs(i*.01-cue)<.021
        selected.append({'cut':cue,'bassOnset':round(i*.01,3),'strength':float(flux[i]),'frame':round(cue*30)})
    write(out/'musical-cues.json',{'bandHz':[35,180],'onsetWindowMs':80,'minimumProminence':.02,'selected':selected,'allOnsets':[{'time':round(i*.01,3),'strength':float(flux[i])}for i in peaks],'intactUntil':27.5,'ruinsAfter':27.5,'duration':63+17/30})
    # Only move the effects stem by two frames; the music's musical clock is unchanged.
    subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-i',str(SOURCE/'Cortes-al-bajo/combinado-efecto.wav'),'-af','volume=9.1dB,adelay=66.666667:all=1','-ac','2','-ar','32000','-c:a','libvorbis','-q:a','3',str(RP/'sounds/warland/past_cinema.ogg')],check=True)
    ui=RP/'ui/hud_screen.json';d=json.loads(ui.read_text(encoding='utf-8'))
    frame=next(c['warland_past_frame']for c in d['root_panel']['modifications'][0]['value']if 'warland_past_frame'in c)
    frame['layer']=250
    for c in frame['controls']:
        b=next(iter(c.values()));b['keep_ratio']=False;b['layer']=250
    # The money widget caches its last title: hide its containing control,
    # not merely the update binding, while the cinematic marker is present.
    def hide(control):
        bindings=control.setdefault('bindings',[])
        if not any(b.get('binding_name')=='#hud_title_text_string' for b in bindings):bindings.append({'binding_name':'#hud_title_text_string'})
        existing=next((b for b in bindings if b.get('target_property_name')=='#visible'),None)
        condition="(not (#hud_title_text_string = 'WL_PAST|FILM'))"
        if existing:
            if 'WL_PAST' not in existing['source_property_name']:existing['source_property_name']='('+existing['source_property_name']+' and '+condition+')'
        else:bindings.append({'binding_type':'view','source_property_name':condition,'target_property_name':'#visible'})
    def walk(o):
        if isinstance(o,dict):
            for k,v in o.items():
                if k.split('@')[0] in ['warcoins','player_position','player_position_panel','coordinates'] and isinstance(v,dict):hide(v)
                walk(v)
        elif isinstance(o,list):
            for v in o:walk(v)
    walk(d)
    # Vanilla coordinate control is separate from the custom title hierarchy.
    d.setdefault('player_position',{})['bindings']=[
        {'binding_name':'#player_position_visible'},
        {'binding_name':'#hud_title_text_string'},
        {'binding_name':'#hud_text_background_alpha','binding_name_override':'#alpha'},
        {'binding_type':'view','source_property_name':"(#player_position_visible and not (#hud_title_text_string = 'WL_PAST|FILM'))",'target_property_name':'#visible'}]
    write(ui,d)
    print(json.dumps({'cuts':selected,'intactSeconds':27.5,'effectsShiftFrames':2}))
if __name__=='__main__':build()
