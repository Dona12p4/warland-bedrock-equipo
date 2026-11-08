import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
// This is a preview of cube geometry and numeric keyframes, NOT a Molang/game engine.
window.createWarlandViewer=function(host,source,images){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));host.prepend(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.05,1500),control=new OrbitControls(camera,renderer.domElement);control.enableDamping=true;control.target.set(0,1,0);
 scene.add(new THREE.HemisphereLight(0xe7f4e3,0x4c4c45,2.5));const key=new THREE.DirectionalLight(0xffedda,3);key.position.set(-8,12,-10);scene.add(key);
 const floor=new THREE.Mesh(new THREE.CircleGeometry(30,80),new THREE.MeshStandardMaterial({color:0x29382b,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;scene.add(floor);
 const wrapper=new THREE.Group();scene.add(wrapper);const skeleton=new THREE.Group();wrapper.add(skeleton);skeleton.scale.setScalar(1/16);
 let tex=null;if(source.texture&&images[source.texture]){tex=new THREE.TextureLoader().load(images[source.texture]);tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;tex.colorSpace=THREE.SRGBColorSpace;}
 const material=new THREE.MeshStandardMaterial({map:tex,color:tex?0xffffff:0x56624e,roughness:1,side:THREE.DoubleSide,alphaTest:.1});
 const geo=source.geometry,tw=geo.description.texture_width??64,th=geo.description.texture_height??64,bones=new Map(),deg=THREE.MathUtils.degToRad;
 const asVec=(v,def=0)=>Array.isArray(v)?v.map(x=>typeof x==='number'?x:def):[def,def,def];
 function setRotation(object,r){object.rotation.set(deg(r[0]),deg(r[1]),deg(r[2]),'ZYX');}
 for(const b of geo.bones??[]){const group=new THREE.Group();bones.set(b.name,{data:b,group,pivot:asVec(b.pivot),rotation:asVec(b.rotation)});}
 for(const {data:b,group,pivot,rotation} of bones.values()){
  const parent=bones.get(b.parent);(parent?.group??skeleton).add(group);group.position.set(...pivot.map((n,i)=>n-(parent?.pivot[i]??0)));setRotation(group,rotation);
  for(const cube of b.cubes??[]){const o=asVec(cube.origin),s=asVec(cube.size),inflate=cube.inflate??0;const bg=new THREE.BoxGeometry(...s.map(x=>Math.max(.001,x+inflate*2))),uv=bg.attributes.uv;
   let faces=cube.uv;if(Array.isArray(faces)){const[u,v]=faces,[x,y,z]=s;faces={west:{uv:[u,v+z],uv_size:[z,y]},north:{uv:[u+z,v+z],uv_size:[x,y]},east:{uv:[u+z+x,v+z],uv_size:[z,y]},south:{uv:[u+2*z+x,v+z],uv_size:[x,y]},up:{uv:[u+z,v],uv_size:[x,z]},down:{uv:[u+z+x,v],uv_size:[x,z]}};}
   for(const [fi,face] of ['east','west','up','down','south','north'].entries()){const data=faces?.[face];if(!data)continue;const[u,v]=data.uv??[0,0],[w,h]=data.uv_size??[s[0],s[1]],flip=cube.mirror??b.mirror;let points=[[u,v],[u+w,v],[u,v+h],[u+w,v+h]];if(flip)points=[points[1],points[0],points[3],points[2]];points.forEach(([a,c],i)=>uv.setXY(fi*4+i,a/tw,1-c/th));}
   const mesh=new THREE.Mesh(bg,material);const center=o.map((n,i)=>n+s[i]/2);if(cube.rotation){const cPivot=asVec(cube.pivot??b.pivot),cg=new THREE.Group();cg.position.set(...cPivot.map((v,i)=>v-pivot[i]));mesh.position.set(...center.map((v,i)=>v-cPivot[i]));setRotation(cg,asVec(cube.rotation));cg.add(mesh);group.add(cg);}else{mesh.position.set(...center.map((v,i)=>v-pivot[i]));group.add(mesh);}
  }
 }
 const box=new THREE.Box3().setFromObject(skeleton),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());wrapper.position.set(-center.x,-box.min.y,-center.z);const height=size.y;
 function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 function frame(){resize();control.target.set(0,height*.49,0);const radius=Math.max(size.y,size.x/camera.aspect,size.z)*1.65;camera.position.set(radius*.55,height*.65,-radius);control.maxDistance=radius*4;control.minDistance=.2;control.update();}
 const ro=new ResizeObserver(resize);ro.observe(host);frame();let clip=null,start=performance.now(),running=true,elapsed=0,prev=performance.now(),alive=true;
 function val(value,fallback){if(Array.isArray(value))return value.map(x=>typeof x==='number'?x:fallback);if(typeof value==='number')return[value,value,value];if(value&&typeof value==='object')return val(value.post??value.pre??value.vector,fallback);return[fallback,fallback,fallback];}
 function sample(track,time,fallback=0){if(Array.isArray(track)||typeof track!=='object'||track===null)return val(track,fallback);const keys=Object.keys(track).filter(k=>Number.isFinite(Number(k))).map(k=>[Number(k),track[k]]).sort((a,b)=>a[0]-b[0]);if(!keys.length)return val(track,fallback);let a=keys[0],b=keys.at(-1);for(let i=0;i<keys.length;i++){if(keys[i][0]<=time)a=keys[i];if(keys[i][0]>=time){b=keys[i];break;}}const va=val(a[1],fallback),vb=val(b[1],fallback),f=a[0]===b[0]?0:Math.max(0,Math.min(1,(time-a[0])/(b[0]-a[0])));return va.map((n,i)=>n+(vb[i]-n)*f);}
 function pose(t){for(const{name,data:b,group,pivot,rotation}of[...bones.entries()].map(([name,v])=>({name,...v}))){const parent=bones.get(b.parent),tracks=clip?.bones?.[name],pos=tracks?sample(tracks.position,t):[0,0,0],rot=tracks?sample(tracks.rotation,t):[0,0,0],scale=tracks?.scale?sample(tracks.scale,t,1):[1,1,1];group.position.set(...pivot.map((n,i)=>n-(parent?.pivot[i]??0)+pos[i]));setRotation(group,rotation.map((n,i)=>n+rot[i]));group.scale.set(...scale);}}
 function tick(now){if(!alive)return;const dt=Math.min((now-prev)/1000,.06);prev=now;if(running)elapsed+=dt;const len=Number(clip?.animation_length)||4;pose(elapsed%len);control.update();renderer.render(scene,camera);requestAnimationFrame(tick);}requestAnimationFrame(tick);
 return{frame,toggle(){running=!running;return running;},setClip(id){clip=source.clips[id]?.data??null;elapsed=0;return !!clip&&/query\.|variable\.|math\.|q\./i.test(JSON.stringify(clip.bones));},dispose(){alive=false;ro.disconnect();control.dispose();scene.traverse(o=>{if(o.isMesh)o.geometry.dispose();});material.dispose();tex?.dispose();floor.material.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
};
