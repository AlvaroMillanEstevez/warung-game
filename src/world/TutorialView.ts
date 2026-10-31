import type Phaser from 'phaser';
import { t } from '../i18n';
import type { Key } from '../i18n';
import { buildCost } from '../simulation/Opening';
import type { Restaurant } from '../simulation/Restaurant';
import { STATIONS } from './layout';
import { PALETTE as C, VISUAL as V } from '../visuals/theme';
export class TutorialView {
 private readonly mark:Phaser.GameObjects.Graphics;
 private readonly blueprint:Phaser.GameObjects.Graphics;
 private readonly objective=document.querySelector<HTMLElement>('#tutorial-objective')!;
 private readonly direction=document.querySelector<HTMLElement>('#tutorial-direction')!;
 private key='';
 constructor(scene:Phaser.Scene){this.mark=scene.add.graphics().setDepth(V.depth.rearMarker+3);this.blueprint=scene.add.graphics().setDepth(V.depth.marker);}
 update(r:Restaurant,camera:Phaser.Cameras.Scene2D.Camera,hidden:boolean):void {
  const step=r.tutorialStep,target=r.tutorialTarget;
  this.objective.hidden=!step;
  if(step){const text=t(('tutorial.'+step) as Key,step==='office'||step==='orders'?{price:buildCost(step)}:undefined)+(step==='move'?' '+t(matchMedia('(pointer: coarse)').matches?'tutorial.touch':'tutorial.keys'):'');
   if(this.objective.textContent!==text)this.objective.textContent=text;}
  const key=String(step)+':'+String(hidden);if(key!==this.key){this.key=key;this.mark.clear();this.blueprint.clear();
   if(target&&!hidden){this.mark.lineStyle(3,C.gold,.9).strokeEllipse(target.x,target.y,52,30);
    this.mark.fillStyle(C.gold).fillTriangle(target.x-7,target.y-25,target.x+7,target.y-25,target.x,target.y-16);}
   const build=r.availableBuild;
   const footprint=build==='office'||build==='orders'?{x:target!.x-24,y:target!.y-20,width:48,height:40}:build?STATIONS.find(s=>s.id===build)?.footprint:null;
   if(footprint){const {x,y,width:w,height:h}=footprint;this.blueprint.lineStyle(2,C.gold,.8).strokeRoundedRect(x,y,w,h,8);
    this.blueprint.lineStyle(3,C.wood,.7).lineBetween(x+8,y+8,x+w-8,y+h-8).lineBetween(x+w-8,y+8,x+8,y+h-8);}
  }
  const view=camera.worldView;
  this.direction.hidden=!target||hidden||(target.x>view.x+30&&target.x<view.right-30&&target.y>view.y+30&&target.y<view.bottom-30);
  if(target&&!this.direction.hidden){this.direction.replaceChildren();const arrow=document.createElement('span');arrow.textContent='➜';arrow.style.transform='rotate('+Math.atan2(target.y-view.centerY,target.x-view.centerX)+'rad)';
   const text=document.createElement('span');text.textContent=t('tutorial.follow');this.direction.append(arrow,text);}
 }
 destroy():void{this.mark.destroy();this.blueprint.destroy();this.objective.hidden=true;this.direction.hidden=true;}
}
