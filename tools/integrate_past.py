from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
bp=R/'packs/behavior_packs/WARLAND_BP/scripts'
p=bp/'main.js';s=p.read_text(encoding='utf-8')
if "import './past.js';" not in s:p.write_text("import './past.js';\n"+s)
p=bp/'personal-hud.js';s=p.read_text(encoding='utf-8').replace('if(combatVisualActive(p.id))continue;',"if(combatVisualActive(p.id)||p.hasTag('warland_past_film'))continue;");p.write_text(s)
p=R/'packs/resource_packs/WARLAND_UmbralLoading_RP/ui/hud_screen.json';d=json.loads(p.read_text(encoding='utf-8'));binding=d['hud_title_text']['bindings'][-1]
if 'WL_PAST|' not in binding['source_property_name']:binding['source_property_name']='('+binding['source_property_name']+" and ((#hud_title_text_string - 'WL_PAST|') = #hud_title_text_string))"
def walk(o):
 if isinstance(o,list):
  for v in o:walk(v)
 elif isinstance(o,dict):
  # Custom Warcoins/attack panels also yield to the cinematic title marker.
  for b in o.get('bindings',[]):
   expr=b.get('source_property_name','')
   if b.get('target_property_name')=='#visible' and ('WL_HUD|' in expr or 'WL_ATK|' in expr) and 'WL_PAST|' not in expr:
    b['source_property_name']='('+expr+" and (#hud_title_text_string != 'WL_PAST|FILM'))"
  for k,v in o.items():
   if k!='bindings':walk(v)
walk(d);p.write_text(json.dumps(d,indent=2)+'\n')
print('Native runtime and HUD integrated.')
