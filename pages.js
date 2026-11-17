// GitHub Pages interactions: enquiries go to WhatsApp; favourites stay in this browser.
const pageContact = JSON.parse(document.querySelector('#site-contact')?.textContent || '{}');
const savedKey = 'magic-waves-favourites';
let savedPhotos = [];
try {
  const saved = JSON.parse(localStorage.getItem(savedKey) || '[]');
  if (Array.isArray(saved)) savedPhotos = saved.filter(id => typeof id === 'string');
} catch { /* Browsing with storage disabled still supports viewing photos. */ }
const staticViewer = document.querySelector('.lightbox');
if (staticViewer) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'lightbox-favorite';
  staticViewer.append(button);
  const currentId = () => {
    const src = staticViewer.querySelector(':scope > img').getAttribute('src');
    return [...document.querySelectorAll('.gallery img')].find(img => (img.dataset.full || img.getAttribute('src')) === src)?.dataset.contentId;
  };
  const refresh = () => {
    const selected = savedPhotos.includes(currentId());
    button.innerHTML = selected ? '&#9829;' : '&#9825;';
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', selected ? 'Remove from favourites' : 'Save to favourites in this browser');
  };
  new MutationObserver(refresh).observe(staticViewer.querySelector(':scope > img'), {attributes:true,attributeFilter:['src']});
  button.addEventListener('click', () => {
    const id = currentId();
    if (!id) return;
    savedPhotos = savedPhotos.includes(id) ? savedPhotos.filter(value => value !== id) : [...savedPhotos,id];
    try { localStorage.setItem(savedKey, JSON.stringify(savedPhotos)); }
    catch { staticViewer.querySelector('figcaption').textContent = 'Favourites can only be kept for this visit because browser storage is unavailable.'; }
    refresh();
  });
  refresh();
}

const searchForm = document.querySelector('.gallery-search');
if (searchForm) {
  const params = new URLSearchParams(location.search);
  const moment = params.get('moment') || 'all';
  const query = (params.get('q') || '').trim().slice(0, 200);
  searchForm.elements.q.value = query;
  searchForm.elements.moment.value = moment;
  // Collection pages are exported as directories; only moment/search filter in the browser.
  searchForm.addEventListener('submit', event => {
    event.preventDefault();
    const next = new URL(location.href);
    next.searchParams.set('q', searchForm.elements.q.value);
    next.hash = 'collection-frames';
    location.assign(next.href);
  });
  document.querySelectorAll('.moment-nav a').forEach(link => {
    const active = (new URL(link.href).searchParams.get('moment') || 'all') === moment;
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const terms = query.toLowerCase().match(/\w+/g)?.filter(term => !['show','me','photos','with','the','and','a','of','in'].includes(term)) || [];
  const buttons = [...document.querySelectorAll('.gallery .photo-card')];
  // The shared gallery creates its buttons before this script runs.
  const frames = buttons.length ? buttons : [...document.querySelector('.gallery').children];
  let count = 0;
  frames.forEach(frame => {
    const img = frame.querySelector('img');
    const matchingMoment = moment === 'all' || img.dataset.moment === moment;
    const matchingQuery = !query || terms.some(term => (img.dataset.search || img.alt).toLowerCase().includes(term));
    frame.hidden = !matchingMoment || !matchingQuery;
    if (!frame.hidden) count++;
  });
  document.querySelector('.archive-heading > span').textContent = `${count} FRAMES`;
  if (!count) {
    const empty = document.createElement('p'); empty.className = 'collection-empty';
    empty.textContent = 'No photographs match this view. Try another search or choose Every Moment.';
    document.querySelector('.gallery').after(empty);
  }
  balancePhotoRows();
}

const staticBooking = document.querySelector('#booking-form');
function enquiryMessage(values) {
  const lines = ['Hello Magic Waves, I would like to enquire about a shoot.',
    `Name: ${values.name || ''}`, `Phone / WhatsApp: ${values.phone || ''}`, `Occasion: ${values.shoot || ''}`];
  for (const [key,label] of [['date','Preferred date'],['city','City / venue'],['mood','Mood'],['hours','Coverage hours'],['photographers','Photographers']]) {
    if (values[key]) lines.push(`${label}: ${values[key]}`);
  }
  if (staticBooking) lines.push(`Film: ${staticBooking.elements.film.checked ? 'yes' : 'no'}`, `Printed album: ${staticBooking.elements.album.checked ? 'yes' : 'no'}`);
  if (values.message) lines.push(`Message: ${values.message}`);
  if (savedPhotos.length) lines.push(`Favourite photo references: ${savedPhotos.join(', ')}`);
  return lines.join('\n');
}
for (const enquiry of [document.querySelector('#contact form'), staticBooking].filter(Boolean)) {
  const feedback = enquiry.querySelector('.form-note, .booking-feedback');
  if (!pageContact.whatsapp) {
    enquiry.querySelector('button[type=submit]').disabled = true;
    feedback.textContent = 'The studio contact number is being updated. Please check back soon.';
  }
  enquiry.addEventListener('submit', event => {
    event.preventDefault();
    if (!pageContact.whatsapp || !enquiry.reportValidity()) return;
    const values = Object.fromEntries(new FormData(enquiry));
    if (values.company) return;
    if (!/^[+\d\s().-]{7,30}$/.test(values.phone || '') || (values.phone.match(/\d/g) || []).length < 7) {
      feedback.textContent = 'Please enter a valid phone number, including your country code.';
      return;
    }
    if (!values.mood) values.mood = document.querySelector('#shoot-mood')?.selectedOptions[0]?.textContent;
    feedback.textContent = 'Opening WhatsApp. Review and send your message there to contact the studio.';
    location.assign(`https://wa.me/${pageContact.whatsapp}?text=${encodeURIComponent(enquiryMessage(values))}`);
  });
}
if (staticBooking) {
  const today = new Date();
  staticBooking.elements.date.min = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const summary = () => {
    const values = Object.fromEntries(new FormData(staticBooking));
    document.querySelector('#quote-coverage').textContent = `${values.hours} hours / ${values.photographers} photographer${values.photographers === '1' ? '' : 's'}`;
    document.querySelector('#quote-addons').textContent = ['Photography',staticBooking.elements.film.checked ? 'Film coverage' : '',staticBooking.elements.album.checked ? 'Printed album' : ''].filter(Boolean).join(' + ');
  };
  staticBooking.addEventListener('input', summary);
  summary();
}
