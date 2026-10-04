import { useEffect, useState } from 'react';
import { audio } from './audio/engine';
import { DARK_THEMES, Theme } from './components/Panel';
import { CHAPTER_IDS, TopBar } from './components/TopBar';
import { startSmoothScroll } from './motion/scroll';
import { Attention } from './sections/Attention';
import { Contrast } from './sections/Contrast';
import { Emotion } from './sections/Emotion';
import { Final } from './sections/Final';
import { Hero } from './sections/Hero';
import { Possibilities } from './sections/Possibilities';
import { Process } from './sections/Process';
import { Rhythm } from './sections/Rhythm';
import { Silence } from './sections/Silence';
import { Sound } from './sections/Sound';
import { Story } from './sections/Story';
import { Timing } from './sections/Timing';
import { Weight } from './sections/Weight';

export default function App() {
  const [current, setCurrent] = useState(0);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    startSmoothScroll();
    const meta = document.querySelector('meta[name="theme-color"]');
    // the top bar reacts to whatever is under it
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const idx = CHAPTER_IDS.indexOf(el.id);
          if (idx >= 0) setCurrent(idx);
          const isDark = DARK_THEMES.includes(el.dataset.theme as Theme);
          setDark(isDark);
          meta?.setAttribute('content', isDark ? '#0c0c0d' : '#f2efe9');
          audio.air(0);
        });
      },
      { rootMargin: '-6% 0px -93% 0px' },
    );
    document.querySelectorAll('section[data-theme]').forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <TopBar current={current} dark={dark} />
      <main>
        <Hero />
        <Attention />
        <Timing />
        <Weight />
        <Rhythm />
        <Contrast />
        <Sound />
        <Emotion />
        <Silence />
        <Story />
        <Process />
        <Possibilities />
        <Final />
      </main>
    </>
  );
}
