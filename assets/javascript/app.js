class _app {
  id = 0;
  videoElement = null;
  audioElement = null;
  musicVolume = 0.20;
  musicFadeIn = 4000;
  effects = ['bounce', 'flash', 'pulse', 'rubberBand', 'shake', 'swing', 'tada', 'wobble', 'jello'];
  brandDescription = ['Blueprint  |  C++  |  UI Implementation'];

  titleChanger = (text, delay) => {
    if (!text) return;

    delay = delay || 500;

    let counter = 0;

    setInterval(() => {  
      if (counter < text.length) document.title = text[counter++];
      else document.title = text[(counter = 0)];
    }, delay);
  };
}


const app = new _app();
