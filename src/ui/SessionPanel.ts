import { chooseLanguage, i18n, t } from '../i18n';
import type { Key, Language } from '../i18n';
import type { Restaurant } from '../simulation/Restaurant';
import type { BuildId } from '../simulation/Opening';
import { buildCost } from '../simulation/Opening';
import type { Point } from '../world/layout';
type Screen='intro'|'continue'|'invalid'|'settings'|'new'|'build';
export class SessionPanel {
 private readonly dialog=document.querySelector<HTMLDialogElement>('#session-panel')!;
 private readonly content=document.querySelector<HTMLElement>('#session-content')!;
 private screen:Screen='settings';private previous:Screen='settings';private build:BuildId='repair';
 private readonly unsubscribe:()=>void;
 get isOpen():boolean{return this.dialog.open;}
 constructor(private readonly restaurant:Restaurant,private readonly position:()=>Point,private readonly toggle:(open:boolean)=>void,
  private readonly changed:()=>void,private readonly newGame:()=>void,private readonly resume:()=>void,private readonly canAdvanced:boolean) {
  this.dialog.addEventListener('cancel',this.cancel);
  this.unsubscribe=i18n.subscribe(()=>{if(this.isOpen)this.render();});
 }
 private readonly cancel=(event:Event):void=>{event.preventDefault();if(this.screen==='new'){this.show(this.previous);return;}
  if(this.screen==='continue'||this.screen==='invalid')return;this.close();};
 show(screen:Screen,build?:BuildId):void {this.screen=screen;if(build)this.build=build;this.toggle(true);this.render();if(!this.isOpen)this.dialog.showModal();}
 close():void {if(!this.isOpen)return;if(this.screen==='intro'){this.restaurant.opening.introSeen=true;this.changed();}
  this.dialog.close();this.toggle(false);document.querySelector<HTMLElement>('#game')!.focus({preventScroll:true});}
 destroy():void {this.dialog.close();this.dialog.removeEventListener('cancel',this.cancel);this.unsubscribe();}
 private render():void {
  this.content.replaceChildren();
  const add=(key:Key,tag='p',params?:Record<string,string|number>)=>{const el=document.createElement(tag);el.textContent=t(key,params);this.content.append(el);return el;};
  const button=(id:string,key:Key,fn:()=>void)=>{const b=document.createElement('button');b.id=id;b.type='button';b.textContent=t(key);
   b.addEventListener('click',e=>{e.stopPropagation();fn();},{once:true});this.content.append(b);return b;};
  const confirmNew=()=>{this.previous=this.screen;this.show('new');};
  add(this.screen==='build'?('opening.'+this.build) as Key:('session.'+this.screen) as Key,'h2',this.screen==='build'?{price:buildCost(this.build)}:undefined);
  if(this.screen==='intro'){add('opening.intro');button('start-opening','common.close',()=>this.close());}
  else if(this.screen==='continue'){add('session.found');button('continue-game','session.continue',()=>{this.close();this.resume();});button('new-game','session.new',confirmNew);}
  else if(this.screen==='invalid'){add('save.invalid');button('new-game','session.new',confirmNew);}
  else if(this.screen==='new'){add('session.confirmNew');button('confirm-new','session.new',()=>{this.close();this.newGame();});button('cancel-new','common.cancel',()=>this.show(this.previous));}
  else if(this.screen==='build'){
   if(this.build==='office'||this.build==='orders')add(this.build==='office'?'progress.officeHelp':'progress.ordersHelp');
   add('opening.price','p',{price:buildCost(this.build)});add('bulk.paused');
   const problem=this.restaurant.buildProblem(this.build,this.position());if(problem)add(problem);
   button('confirm-build','opening.buy',()=>{if(this.restaurant.construct(this.build,this.position())){this.changed();this.close();}else this.render();}).disabled=!!problem;
   button('cancel-build','common.cancel',()=>this.close());
  }else{
   add(this.restaurant.mode==='advanced'?'session.dev':'save.local');
   button('resume-game','common.close',()=>this.close());button('new-game','session.new',confirmNew);
   if(this.canAdvanced){const a=document.createElement('a');a.href=this.restaurant.mode==='advanced'?'./':'?escenario=avanzado&monedas=2000';a.textContent=t(this.restaurant.mode==='advanced'?'session.normal':'session.advanced');this.content.append(a);}
  }
  if(this.screen!=='build'){
   const label=document.createElement('label');label.className='language-setting';label.textContent=t('office.language');
   const select=document.createElement('select');select.id='session-language';
   for(const lang of ['es','en','id'] as const){const option=document.createElement('option');option.value=lang;option.textContent=t(('language.'+lang) as Key);select.append(option);}
   select.value=i18n.current;select.addEventListener('change',()=>chooseLanguage(select.value as Language));label.append(select);this.content.append(label);
  }
 }
}
