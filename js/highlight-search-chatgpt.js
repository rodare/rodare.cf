(function () {
  function removeDiacritics(s) {
    return s && s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : (s || '');
  }

  function findNormalizedIndexInOriginal(original, term) {
    const mapping = [];
    const normalizedChars = [];
    for (let i = 0; i < original.length; i++) {
      const origChar = original[i];
      const norm = removeDiacritics(origChar) || origChar;
      for (let j = 0; j < norm.length; j++) {
        normalizedChars.push(norm[j]);
        mapping.push(i);
      }
    }
    const normalized = normalizedChars.join('').toLowerCase();
    const normalizedTerm = removeDiacritics(term).toLowerCase();
    const pos = normalized.indexOf(normalizedTerm);
    if (pos === -1) return null;
    const startOrig = mapping[pos];
    const endOrig = mapping[pos + normalizedTerm.length - 1] + 1;
    return { start: startOrig, end: endOrig };
  }

  function tryHighlightInTextNode(textNode, term) {
    const original = textNode.nodeValue;
    if (!original || !original.trim()) return null;
    const found = findNormalizedIndexInOriginal(original, term);
    if (!found) return null;
    const before = document.createTextNode(original.slice(0, found.start));
    const mark = document.createElement('mark');
    mark.textContent = original.slice(found.start, found.end);
    const after = document.createTextNode(original.slice(found.end));
    const parent = textNode.parentNode;
    parent.replaceChild(after, textNode);
    parent.insertBefore(mark, after);
    parent.insertBefore(before, mark);
    return mark;
  }

  function highlightFirstMatch(container, term) {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          let el = node.parentElement;
          const forbidden = ['SCRIPT', 'STYLE', 'IFRAME', 'NOSCRIPT', 'INPUT', 'TEXTAREA'];
          while (el) {
            if (forbidden.includes(el.tagName)) return NodeFilter.FILTER_REJECT;
            el = el.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    let node;
    while (node = walker.nextNode()) {
      const mark = tryHighlightInTextNode(node, term);
      if (mark) return mark;
    }
    return null;
  }

  function expandIfHidden(moreEl) {
    if (!moreEl) return Promise.resolve();
    const computed = window.getComputedStyle(moreEl);
    if (computed.display !== 'none' && computed.visibility !== 'hidden') return Promise.resolve();

    const post = moreEl.closest('.post') || moreEl.closest('.card') || moreEl.closest('article');
    if (!post) {
      moreEl.style.display = 'block';
      return Promise.resolve();
    }

    const readBtn = post.querySelector('.read');
    if (readBtn) {
      try { readBtn.click(); } catch (e) {}
    }

    return new Promise(resolve => {
      setTimeout(() => {
        const cs2 = window.getComputedStyle(moreEl);
        if (cs2.display === 'none') {
          moreEl.style.display = 'block';
          const dots = post.querySelector('.dots');
          if (dots) dots.style.display = 'none';
          if (readBtn) readBtn.textContent = 'read less';
        }
        resolve();
      }, 220);
    });
  }

  function scrollToMark(markEl) {
    if (!markEl) return;
    try {
      markEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        const rect = markEl.getBoundingClientRect();
        const offset = rect.top + window.pageYOffset - (window.innerHeight / 2);
        window.scrollTo({ top: offset, behavior: 'smooth' });
      }, 300);
    } catch (e) {
      try { markEl.scrollIntoView(); } catch (e) {}
    }
  }

  window.addEventListener('load', () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const term = params.get('highlight');
      if (!term) return;

      const container = document.querySelector('main') || document.querySelector('.wrapper') || document.body;
      if (!container) return;

      const mark = highlightFirstMatch(container, term);
      if (!mark) return;

      const more = mark.closest('.more');
      expandIfHidden(more).then(() => {
        const m = container.querySelector('mark');
        scrollToMark(m);
        if (m) {
          m.style.transition = 'background-color 0.6s';
          m.style.backgroundColor = '#ffeb79';
          setTimeout(() => { m.style.backgroundColor = ''; }, 1400);
        }
      });
    } catch (err) {
      console.error('Highlight script error:', err);
    }
  });
})();
