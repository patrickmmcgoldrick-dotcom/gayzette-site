const search=document.querySelector('#podcast-search');
const categoryButtons=[...document.querySelectorAll('[data-podcast-filter]')];
let selectedCategory='All';
function filterEpisodes(){const query=(search?.value||'').trim().toLocaleLowerCase();let visible=0;document.querySelectorAll('[data-episode-card]').forEach(card=>{const match=(selectedCategory==='All'||card.dataset.category===selectedCategory)&&card.textContent.toLocaleLowerCase().includes(query);card.hidden=!match;if(match)visible++;});const status=document.querySelector('#podcast-count');if(status)status.textContent=visible+' '+(visible===1?'episode':'episodes')+' shown';const empty=document.querySelector('#podcast-empty');if(empty)empty.hidden=visible!==0;}
search?.addEventListener('input',filterEpisodes);
categoryButtons.forEach(button=>button.addEventListener('click',()=>{selectedCategory=button.dataset.podcastFilter;categoryButtons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));filterEpisodes();}));
