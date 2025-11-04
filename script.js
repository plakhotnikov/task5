// ===== ДАННЫЕ (массивы) =====
const QUESTIONS = [
  {
    text: "А когда с человеком может произойти дрожемент?",
    options: [
      { t: "Когда он влюбляется", ok: false },
      { t: "Когда он идет шопиться", ok: false },
      { t: "Когда он слышит смешную шутку", ok: false },
      { t: "Когда он боится, пугается", ok: true, explain: "Лексема «дрожемент» имплицирует состояние крайнего напряжения и страха: «У меня всегда дрожемент в ногах, когда копы подходят»." },
    ]
  },
  {
    text: "Говорят, Антон заовнил всех. Это ещё как понимать?",
    options: [
      { t: "Как так, заовнил? Ну и хамло. Кто с ним теперь дружить-то будет?", ok: false },
      { t: "Антон очень надоедливый и въедливый человек, всех задолбал", ok: false },
      { t: "Молодец, Антон, всех победил!", ok: true, explain: "«Заовнить» — из англ. own: «победить», «завладеть», «получить»." },
      { t: "Нет ничего плохого в том, что Антон тщательно выбирает себе друзей", ok: false },
    ]
  },
  {
    text: "А фразу «заскамить мамонта» как понимать?",
    options: [
      { t: "Разозлить кого-то из родителей", ok: false },
      { t: "Увлекаться археологией", ok: false },
      { t: "Развести недотёпу на деньги", ok: true, explain: "«Заскамить мамонта» — обмануть, развести на деньги. «Мамонт» — пожилой/наивный человек, удобная жертва мошенников." },
      { t: "Оскорбить пожилого человека", ok: false },
    ]
  },
  {
    text: "Кто такие бефефе?",
    options: [
      { t: "Вши?", ok: false },
      { t: "Милые котики, такие милые, что бефефе", ok: false },
      { t: "Лучшие друзья", ok: true, explain: "«Бефефе» — от англ. best friends forever (BFF): лучшие друзья навсегда." },
      { t: "Люди, которые не держат слово", ok: false },
    ]
  },
];

// ===== Утилиты =====
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const shuffle = (arr) => arr.map(v => [Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);

// ===== Селекторы на базовые блоки (по классам из index.html) =====
const elProgress = $('.progress');
const elBannerTop = $('.finished-banner.top');
const elBannerBottom = $('.finished-banner.bottom');
const elBannerInfo = $('.banner');
const elStage = $('.stage');
const elStats = $('.stats');
const elReviewNote = $('.review-note');

// Баннер с правилами (добавим текст из ТЗ)
elBannerInfo.innerHTML = '<strong>Правила:</strong> вопросы и ответы в случайном порядке; выберите ответ — через пару секунд блоки уедут <em>вправо</em>, появится маркер. По завершении будет статистика. В режиме обзора жмите на заголовки вопросов — покажется правильный ответ (только один за раз).';

// ===== Состояние =====
let shuffledQs = [];
let currentIndex = 0;
let score = 0;
let locked = false; // запрет выбора следующего, пока не завершён вопрос
let reviewMode = false; // включается после завершения всех вопросов

function setProgress(i, total) {
  if (!elProgress) return;
  elProgress.textContent = `Вопрос ${Math.min(i, total)} / ${total}`;
}

function svgCheck() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.55 17.54 4.8 12.8l1.41-1.41 3.34 3.34 7.24-7.24 1.41 1.41-8.65 8.65z"/></svg>`;
}
function svgCross() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3z"/></svg>`;
}

function buildQCard(q, idx, total) {
  const card = document.createElement('article');
  card.className = 'qcard';

  const head = document.createElement('div');
  head.className = 'qhead';

  const num = document.createElement('div');
  num.className = 'qnum';
  num.textContent = idx + 1; // нумерация вопросов

  const title = document.createElement('div');
  title.className = 'qtitle';
  title.textContent = q.text;

  const marker = document.createElement('div');
  marker.className = 'marker';
  marker.style.minWidth = '24px';

  head.append(num, title, marker);

  const list = document.createElement('div');
  list.className = 'answers';

  // перемешиваем варианты
  const options = shuffle(q.options.map((o,i)=>({...o,_i:i})));

  options.forEach((opt) => {
    const item = document.createElement('div');
    item.className = 'ans';
    item.dataset.ok = opt.ok ? '1' : '0';
    item.innerHTML = `<div class="text">${opt.t}</div>` + (opt.explain ? `<div class="explain">${opt.explain}</div>` : '');

    item.addEventListener('click', () => {
      if (locked || reviewMode) return;
      locked = true;

      const correct = !!opt.ok;
      if (correct) score++;

      marker.style.color = correct ? 'var(--accent-2)' : 'var(--danger)';
      marker.innerHTML = correct ? `${svgCheck()} Верно` : `${svgCross()} Неверно`;

      if (correct) item.classList.add('expanded');

      // Через ~900 мс все варианты уезжают вправо (по условию варианта 1)
      const answers = $$('.ans', card);
      setTimeout(() => {
        // Если ответ верный — логика: «все неправильные ответы перемещаются вправо, потом исчезает правильный»
        if (correct) {
          answers.forEach(a => { if (a !== item) a.classList.add('slide-right'); });
        } else {
          // Неверный — «все блоки перемещаются вправо»
          answers.forEach(a => a.classList.add('slide-right'));
        }
      }, 900);

      // После сдвига — убираем список и переходим дальше
      setTimeout(() => {
        list.remove();
        nextQuestion();
      }, 1650);
    });

    list.appendChild(item);
  });

  card.append(head, list);

  // Режим обзора: клик по заголовку показывает только правильный ответ и скрывает остальные
  head.addEventListener('click', () => {
    if (!reviewMode) return;
    // Скрыть ответы у всех карточек
    $$('.answers[data-review="1"]').forEach(list => {
      list.style.display = 'none';
      $$('.ans', list).forEach(a => { a.style.display = ''; a.classList.remove('expanded'); });
    });

    const list = $('.answers', card);
    if (!list) return;
    // Показать только правильный ответ у текущей карточки
    const right = $$('.ans', list).find(a => a.dataset.ok === '1') ||
                  $$('.ans', list).find(a => a.querySelector('.explain'));
    if (right) {
      $$('.ans', list).forEach(a => { if (a !== right) a.style.display = 'none'; });
      right.classList.add('expanded');
      list.style.display = 'grid';
      list.dataset.review = '1';
    }
  });

  return card;
}

function mountCurrent() {
  elStage.innerHTML = '';

  // Если вопросы закончились — показываем баннеры и статистику
  if (currentIndex >= shuffledQs.length) {
    elBannerTop.classList.add('show');
    elBannerTop.textContent = 'Вопросы закончились';
    elBannerBottom.classList.add('show');
    elBannerBottom.textContent = 'Вопросы закончились';

    elStats.classList.add('show');
    elStats.innerHTML = `<strong>Статистика:</strong> верно ${score} из ${shuffledQs.length}`;

    elReviewNote.classList.add('show');
    elReviewNote.textContent = 'Режим обзора: нажмите на заголовок вопроса, чтобы показать правильный ответ. Одновременно раскрывается только один.';

    setProgress(shuffledQs.length, shuffledQs.length);
    reviewMode = true;

    // Показать все карточки (но без списка ответов по умолчанию)
    const cards = shuffledQs.map((q, i) => buildQCard(q, i, shuffledQs.length));
    elStage.append(...cards);
    $$('.answers', elStage).forEach(list => {
      list.style.display = 'none';
      list.dataset.review = '1';
      $$('.ans', list).forEach(a => a.classList.remove('expanded'));
    });
    return;
  }

  // Иначе — обычный ход теста
  elBannerTop.classList.remove('show');
  elBannerBottom.classList.remove('show');
  elStats.classList.remove('show');
  elReviewNote.classList.remove('show');

  const q = shuffledQs[currentIndex];
  const card = buildQCard(q, currentIndex, shuffledQs.length);
  elStage.appendChild(card);
  setProgress(currentIndex, shuffledQs.length);
  locked = false;
}

function nextQuestion() {
  currentIndex++;
  setProgress(currentIndex, shuffledQs.length);
  setTimeout(() => { locked = false; mountCurrent(); }, 200);
}

function init() {
  shuffledQs = shuffle(QUESTIONS);
  setProgress(0, shuffledQs.length);
  currentIndex = 0;
  score = 0;
  reviewMode = false;
  // Подготовим подписи баннеров (скрыты до завершения)
  elBannerTop.textContent = '';
  elBannerBottom.textContent = '';
  mountCurrent();
}

// Старт
init();