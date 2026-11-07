'use strict';
(() => {
 const root=document.documentElement, body=document.body;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const coarse=matchMedia('(pointer: coarse)');
 const lowPower=navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4;
 const button=document.getElementById('effects'), world=document.querySelector('.world');
 let preference=true;
 try{preference=localStorage.getItem('annakam-effects')!=='off';}catch{}
 let enabled=false,frame=0,lastFrame=0,clock=0,lastClock=0,pointer={x:0,y:0},target={x:0,y:0};
 let ctxAudio,source,analyser,bins,audio;
 let frameCounter=0,glProgram,gl,texture,uniforms,textureReady=false;
 const landscape=document.getElementById('landscape'),dust=document.getElementById('dust'),spectrum=document.getElementById('spectrum');
 const dustCtx=dust.getContext('2d'), spectrumCtx=spectrum.getContext('2d');
 let stars=[],size={w:innerWidth,h:innerHeight},sphereSize=0,energy=0;
 const vertex='attribute vec2 p; void main(){gl_Position=vec4(p,0.,1.);}';
 const fragment=`precision mediump float;
 uniform sampler2D picture; uniform vec2 resolution; uniform vec2 cover;
 uniform vec2 pointer; uniform float time; uniform float energy;
 void main(){
  vec2 screen=gl_FragCoord.xy/resolution;
  vec2 uv=(screen-.5)*cover+.5;
  float sky=smoothstep(.42,.85,uv.y);
  float water=1.-smoothstep(.25,.43,uv.y);
  float ripple=sin(uv.y*160.+time*.75)+sin(uv.y*89.-time*.53);
  uv.x+=sky*sin(uv.y*5.+time*.11)*.0035+water*ripple*.0017;
  uv.y+=sky*sin(uv.x*8.-time*.14)*.002+water*sin(uv.x*25.+time*.5)*.0007;
  uv+=pointer*.0025;
  vec3 base=texture2D(picture,clamp(uv,vec2(.001),vec2(.999))).rgb;
  float breath=.5+.5*sin(time*.21+uv.x*4.);
  base*=1.+sky*(breath*.11+energy*.07);
  float glow=pow(max(0.,sin(uv.x*7.+uv.y*3.-time*.07)),6.)*sky*.012;
  base+=vec3(.25,.60,.47)*glow;
  gl_FragColor=vec4(base,1.);
 }`;
 function shader(type,code){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw new Error('Shader unavailable');}return s;}
 function initGL(){
  try{
   gl=landscape.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power',preserveDrawingBuffer:true});
   if(!gl)return;
   glProgram=gl.createProgram();const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);gl.attachShader(glProgram,vs);gl.attachShader(glProgram,fs);gl.linkProgram(glProgram);
   if(!gl.getProgramParameter(glProgram,gl.LINK_STATUS))throw new Error('WebGL unavailable');
   gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(glProgram);
   const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const position=gl.getAttribLocation(glProgram,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
   uniforms={};['resolution','cover','pointer','time','energy','picture'].forEach(n=>uniforms[n]=gl.getUniformLocation(glProgram,n));
   texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   const image=new Image();image.onload=()=>{if(gl.isContextLost())return;gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);size.imageAspect=image.width/image.height;textureReady=true;world.classList.add('ready');resize();drawGL();};image.src='assets/aurora-coast-v001.png';
   landscape.addEventListener('webglcontextlost',e=>{e.preventDefault();textureReady=false;world.classList.remove('ready');});
   landscape.addEventListener('webglcontextrestored',()=>{textureReady=false;world.classList.remove('ready');});
  }catch{gl=null;world.classList.remove('ready');}
 }
 function resize(){
  size.w=document.documentElement.clientWidth;size.h=innerHeight;
  const ratio=Math.min(devicePixelRatio||1,coarse.matches?1:1.25),scale=Math.min(1,1440/(size.w*ratio));
  landscape.width=Math.round(size.w*ratio*scale);landscape.height=Math.round(size.h*ratio*scale);
  dust.width=size.w;dust.height=size.h;
  const box=spectrum.getBoundingClientRect();sphereSize=box.width;const dpr=Math.min(devicePixelRatio||1,1.5);spectrum.width=Math.round(box.width*dpr);spectrum.height=Math.round(box.height*dpr);
  if(spectrumCtx)spectrumCtx.setTransform(dpr,0,0,dpr,0,0);
  stars=Array.from({length:coarse.matches||lowPower?18:40},(_,i)=>({x:((i*73.83)%100)/100,y:((i*31.37)%100)/100,r:.5+(i%3)*.35,s:.04+(i%7)*.012}));
  if(gl&&textureReady)drawGL();drawSpectrum();drawDust();
 }
 function drawGL(){
  if(!gl||!textureReady||gl.isContextLost())return;
  gl.viewport(0,0,landscape.width,landscape.height);gl.useProgram(glProgram);
  const aspect=landscape.width/landscape.height,ia=size.imageAspect||1.777;
  gl.uniform2f(uniforms.resolution,landscape.width,landscape.height);
  gl.uniform2f(uniforms.cover,aspect>ia?1:aspect/ia,aspect>ia?ia/aspect:1);
  gl.uniform2f(uniforms.pointer,enabled?pointer.x:0,enabled?pointer.y:0);
  gl.uniform1f(uniforms.time,clock);gl.uniform1f(uniforms.energy,energy);
  gl.uniform1i(uniforms.picture,0);gl.drawArrays(gl.TRIANGLES,0,6);
 }
 function drawDust(){
  if(!dustCtx)return;dustCtx.clearRect(0,0,dust.width,dust.height);if(!enabled)return;
  for(let i=0;i<stars.length;i++){const p=stars[i],x=((p.x*size.w+Math.sin(clock*p.s+i)*18+pointer.x*7)%size.w+size.w)%size.w,y=((p.y*size.h-clock*p.s*5)%size.h+size.h)%size.h;
   dustCtx.beginPath();dustCtx.arc(x,y,p.r,0,Math.PI*2);dustCtx.fillStyle='rgba(210,238,203,'+(.12+(.5+.5*Math.sin(clock*.35+i))*.25)+')';dustCtx.fill();
  }
 }
 let haloEnergy=0;
 function drawSpectrum(){
  if(!spectrumCtx||!sphereSize)return;
  const c=spectrumCtx,extent=sphereSize,s=extent/1.4,cx=extent/2;
  c.clearRect(0,0,extent,extent);c.lineCap='round';
  const active=enabled&&audio&&!audio.paused&&analyser;
  if(active)analyser.getByteFrequencyData(bins);
  const playing=enabled&&audio&&!audio.paused&&!audio.ended&&audio.readyState>=2;
  let sum=0;
  const count=active?Math.min(24,bins.length):0;
  for(let i=0;i<count;i++)sum+=(bins[i]/255)**2;
  energy=count?Math.sqrt(sum/count):0;
  const target=playing?.13+energy*.87:0;
  haloEnergy=enabled?haloEnergy+(target-haloEnergy)*(target>haloEnergy?.27:.12):0;
  const radius=s*(.42+haloEnergy*.24);
  const hue=192-149*haloEnergy;
  const alpha=.15+haloEnergy*.54;
  const halo=c.createRadialGradient(cx,cx,0,cx,cx,radius);
  halo.addColorStop(0,'transparent');
  halo.addColorStop(s*.23/radius,'transparent');
  halo.addColorStop(s*.32/radius,'hsla('+hue+',96%,75%,'+alpha+')');
  halo.addColorStop(.88,'hsla('+hue+',96%,62%,'+(alpha*.08)+')');
  halo.addColorStop(1,'transparent');
  c.fillStyle=halo;c.fillRect(0,0,extent,extent);
  // Abstract holographic instrument motifs: driven by their characteristic frequency bands.
  if(active){
   const band=(from,to)=>{let total=0,n=0;for(let j=from;j<to&&j<bins.length;j++){total+=bins[j];n++;}return n?total/n/255:0;};
   const holograms=[
    {level:band(5,16),hue:30,x:-.31,y:.19,kind:0},   // bass guitar — amber
    {level:band(15,34),hue:44,x:.30,y:.19,kind:1},   // trombone — brass gold
    {level:band(32,62),hue:194,x:-.3,y:-.2,kind:2},  // saxophone — electric cyan
    {level:band(60,106),hue:282,x:.3,y:-.2,kind:3}   // violin — violet
   ];
   holograms.forEach(h=>{const power=Math.max(0,(h.level-.2)/.8);if(power<.06)return;const x=cx+s*h.x,y=cx+s*h.y,scale=s*(.07+power*.045);c.save();c.translate(x,y);c.rotate((clock*.2+h.kind)*.22);c.scale(scale,scale);c.globalAlpha=.16+power*.58;c.lineWidth=1.3/scale;c.strokeStyle='hsla('+h.hue+',100%,72%,1)';c.shadowBlur=14/scale;c.shadowColor='hsla('+h.hue+',100%,70%,1)';c.beginPath();if(h.kind===0){c.arc(-.24,0,.18,0,Math.PI*2);c.moveTo(-.06,-.1);c.lineTo(.58,-.52);c.lineTo(.68,-.47);c.moveTo(.58,-.52);c.lineTo(.72,-.62);}if(h.kind===1){c.arc(-.3,0,.2,0,Math.PI*2);c.moveTo(-.1,0);c.lineTo(.62,0);c.lineTo(.62,.22);c.lineTo(.1,.22);c.moveTo(.62,.11);c.lineTo(.83,.11);}if(h.kind===2){c.moveTo(.1,-.6);c.bezierCurveTo(-.45,-.3,.45,.05,-.12,.5);c.lineTo(.12,.63);c.moveTo(.1,-.6);c.lineTo(.3,-.72);c.arc(.35,-.78,.12,0,Math.PI*2);}if(h.kind===3){c.ellipse(-.18,.14,.2,.32,0,0,Math.PI*2);c.ellipse(.18,.14,.2,.32,0,0,Math.PI*2);c.moveTo(0,-.12);c.lineTo(0,-.78);c.moveTo(-.07,-.78);c.lineTo(.07,-.78);}c.stroke();c.restore();});
  }
 }
 function tick(now){
  frame=0;if(!enabled||document.hidden)return;
  const interval=1000/(coarse.matches||lowPower?24:30);
  if(now-lastFrame>=interval){const delta=lastClock?Math.min((now-lastClock)/1000,.1):0;clock+=delta;lastClock=now;lastFrame=now;frameCounter++;
   pointer.x+=(target.x-pointer.x)*.06;pointer.y+=(target.y-pointer.y)*.06;
   root.style.setProperty('--px',pointer.x.toFixed(3));root.style.setProperty('--py',pointer.y.toFixed(3));
   drawSpectrum();drawGL();drawDust();
  }
  frame=requestAnimationFrame(tick);
 }
 function schedule(){cancelAnimationFrame(frame);lastClock=0;if(enabled&&!document.hidden)frame=requestAnimationFrame(tick);else{drawSpectrum();drawGL();drawDust();}}
 function update(){
  enabled=preference&&!reduce.matches;
  body.classList.toggle('motion-on',enabled);body.classList.toggle('motion-off',!enabled);
  button.setAttribute('aria-pressed',String(enabled));button.title=reduce.matches?'Движение отключено в настройках устройства':enabled?'Отключить визуальные эффекты':'Включить визуальные эффекты';
  button.setAttribute('aria-label',button.title);
  if(!enabled){target={x:0,y:0};pointer={x:0,y:0};root.style.setProperty('--px',0);root.style.setProperty('--py',0);document.querySelectorAll('.magnetic,.track').forEach(n=>n.style.removeProperty('transform'));}
  schedule();
 }
 button.addEventListener('click',()=>{if(reduce.matches)return;preference=!preference;try{localStorage.setItem('annakam-effects',preference?'on':'off');}catch{}update();});
 reduce.addEventListener('change',update);coarse.addEventListener('change',resize);
 document.addEventListener('visibilitychange',()=>{body.classList.toggle('tab-hidden',document.hidden);schedule();});
 let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,150);});
 addEventListener('pointermove',e=>{if(!enabled||coarse.matches||lowPower)return;target.x=(e.clientX/innerWidth-.5)*2;target.y=(e.clientY/innerHeight-.5)*2;},{passive:true});
 document.addEventListener('pointermove',e=>{
  if(!enabled||coarse.matches||lowPower)return;
  const magnetic=e.target.closest('.magnetic');
  if(magnetic){const box=magnetic.getBoundingClientRect();const x=(e.clientX-box.left-box.width/2)*.065,y=(e.clientY-box.top-box.height/2)*.065;magnetic.style.transform='translate('+x+'px,'+y+'px)';}
  const card=e.target.closest('.track');
  if(card){const box=card.getBoundingClientRect();card.style.setProperty('--mx',(e.clientX-box.left)+'px');card.style.setProperty('--my',(e.clientY-box.top)+'px');const x=(e.clientX-box.left)/box.width-.5,y=(e.clientY-box.top)/box.height-.5;card.style.transform='perspective(900px) rotateX('+(-y*2)+'deg) rotateY('+(x*2)+'deg) translateY(-3px)';}
 },{passive:true});
 document.addEventListener('pointerout',e=>{const magnetic=e.target.closest('.magnetic'),card=e.target.closest('.track');if(magnetic&&!magnetic.contains(e.relatedTarget))magnetic.style.removeProperty('transform');if(card&&!card.contains(e.relatedTarget))card.style.removeProperty('transform');});
 const observer='IntersectionObserver'in window?new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.remove('waiting');observer.unobserve(e.target);}});},{threshold:.08}):null;
 function observe(){if(observer)document.querySelectorAll('.reveal:not([data-observed])').forEach(n=>{n.dataset.observed='true';if(n.getBoundingClientRect().top>innerHeight+20)n.classList.add('waiting');observer.observe(n);});}
 window.AnnaAtmosphere={
  connectAudio(element){
   audio=element;
   try{
    if(!ctxAudio){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;ctxAudio=new Audio();source=ctxAudio.createMediaElementSource(audio);analyser=ctxAudio.createAnalyser();analyser.fftSize=256;analyser.smoothingTimeConstant=.85;bins=new Uint8Array(analyser.frequencyBinCount);source.connect(analyser);analyser.connect(ctxAudio.destination);}
    if(ctxAudio.state==='suspended')ctxAudio.resume().catch(()=>{});
   }catch{if(source&&ctxAudio){try{source.disconnect();source.connect(ctxAudio.destination);}catch{}}analyser=null;}
  },
  observe,
  getDiagnostics(){return{effects:enabled,reduced:reduce.matches,webgl:Boolean(gl&&textureReady),audioAnalyser:Boolean(analyser),audioContext:ctxAudio?.state,frameCounter,energy};}
 };
 initGL();resize();update();observe();
 addEventListener('pagehide',()=>{cancelAnimationFrame(frame);});addEventListener('pageshow',()=>{resize();schedule();});
})();
