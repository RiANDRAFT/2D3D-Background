// Perspective dust, orbital arcs and light volumes share a slowly moving camera.
let atmosphereTime=0,camera={x:0,y:0};
const dust=Array.from({length:220},(_,i)=>({x:(seeded(i+300)-.5)*2600,y:(seeded(i+600)-.5)*1800,z:seeded(i+900)*1500+250,r:seeded(i+1300)*1.8+.3}));
function drawSpiderAtmosphere(dt,color){const depth=Number(prefs.backgroundDepth),motion=reduced?0:depth;atmosphereTime+=dt*motion;const mx=pointer.x<0?0:(pointer.x/W-.5)*2,my=pointer.y<0?0:(pointer.y/H-.5)*2;camera.x+=(mx*150*motion-camera.x)*Math.min(1,dt*3);camera.y+=(my*100*motion-camera.y)*Math.min(1,dt*3);
 const time=atmosphereTime,cx=W*.55-camera.x*.22,cy=H*.48-camera.y*.22;
 ctx.save();const haze=ctx.createRadialGradient(cx,cy,0,cx,cy,W*.67);haze.addColorStop(0,color+'15');haze.addColorStop(.6,color+'05');haze.addColorStop(1,color+'00');ctx.fillStyle=haze;ctx.fillRect(0,0,W,H);if(!depth){ctx.restore();return}
 // A receding, octagonal volume gives the eye clear near/far reference planes.
 function projectWorld(x,y,z){const perspective=680/(z+450);return[W*.52+(x-camera.x*(1+z/2400))*perspective,H*.49+(y-camera.y*(1+z/2400))*perspective]}
 const rings=[];for(let layer=0;layer<9;layer++){const z=((layer*260-time*36)%2300+2300)%2300;const ring=[];for(let i=0;i<8;i++){const a=i*Math.PI/4+.22;ring.push(projectWorld(Math.cos(a)*950,Math.sin(a)*690,z))}rings.push({z,ring})}
 rings.sort((a,b)=>a.z-b.z);ctx.strokeStyle=color;ctx.lineWidth=.85;for(const entry of rings){ctx.globalAlpha=(.055+.06*(1-entry.z/2300))*Math.min(1,depth);ctx.beginPath();entry.ring.forEach((v,i)=>i?ctx.lineTo(...v):ctx.moveTo(...v));ctx.closePath();ctx.stroke()}
 for(let i=0;i<8;i++){const a=i*Math.PI/4+.22,p=projectWorld(Math.cos(a)*950,Math.sin(a)*690,0),q=projectWorld(Math.cos(a)*950,Math.sin(a)*690,2500);ctx.globalAlpha=.065*Math.min(1,depth);ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.stroke()}
 ctx.globalAlpha=1;
 // Large tilted ellipses create a distant spatial frame, with nearer rings moving faster.
 for(let layer=0;layer<3;layer++){ctx.save();ctx.translate(cx-camera.x*(layer*.3),cy-camera.y*(layer*.3));ctx.rotate(-.34+Math.sin(time*.035+layer)*.1);ctx.scale(1,.32+layer*.075);ctx.beginPath();ctx.arc(0,0,Math.min(W,H)*(.45+layer*.31),0,Math.PI*2);ctx.strokeStyle=color;ctx.globalAlpha=(.08+layer*.015)*Math.min(1,depth);ctx.lineWidth=.6;ctx.stroke();ctx.restore()}
 for(const star of dust){const z=((star.z-time*48)%1600+1600)%1600+180,scale=650/z,x=W/2+(star.x-camera.x*depth)*scale,y=H/2+(star.y-camera.y*depth)*scale;if(x<0||x>W||y<0||y>H)continue;ctx.globalAlpha=Math.min(.42,scale*.14)*Math.min(1,depth);ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,Math.max(.35,Math.min(2.4,star.r*scale)),0,Math.PI*2);ctx.fill()}
 ctx.globalAlpha=1;const vignette=ctx.createRadialGradient(W/2,H/2,H*.16,W/2,H/2,Math.max(W,H)*.65);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#000000a0');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);ctx.restore()}
