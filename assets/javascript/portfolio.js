'use strict';

const timeouts = [];

const mobileAndTabletCheck = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

$(document).ready(() => {
  doIntroAnim()

  if (mobileAndTabletCheck()) {
    $('#background').replaceWith('<div id="background" style="background-image: url(assets/images/mobile-background.jpg);"></div>');

    app.shouldIgnoreVideo = false;
  }

    app.titleChanger(['J', 'Ja', 'Jac', 'Jack', 'Jack S', 'Jack Sl', 'Jack Sla', 'Jack Slas', 'Jack Slask', 'Jack Slaski']);
});

if ($.cookie('videoTime')) {
  app.videoElement.currentTime = $.cookie('videoTime');
  app.audioElement.currentTime = $.cookie('videoTime');
}

document.body.onkeyup = (event) => {
  if (event.keyCode == 32 && app.skippedIntro) {
    if (app.backgroundToggler) {
      app.videoElement.play();
      app.audioElement.play();
    } else {
      app.videoElement.pause();
      app.audioElement.pause();
    }

    return (app.backgroundToggler = !app.backgroundToggler);
  }
};

$.fn.extend({
  animateCss: function (animationName) {
    const animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';

    this.addClass(`animated ${animationName}`).one(animationEnd, () => {
      $(this).removeClass(`animated ${animationName}`);
    });

    return this;
  },
});

const writeLine = (text, speed, timeout, callback) => {
  timeout = typeof timeout === 'number' ? timeout : [0, (callback = timeout)];

  const lineNumber = app.id !== 2 ? ++app.id : (app.id += 2);

  setTimeout(() => {
    const typed = new Typed(`#line${lineNumber}`, {
      strings: text,
      typeSpeed: speed,
      onComplete: callback,
    });
  }, timeout);
};

const doIntroAnim = () => {
    $('.top-right').remove();
    $('.brand-header').remove();
    $('.container').fadeIn(2000);
    $('.background').fadeIn(2000);

    setTimeout(() => {
        const typed = new Typed('#brand', {
            strings: app.brandDescription,
            typeSpeed: 40,

            onComplete: () => {
                clearCursor();
            },
        });
    }, 1350);

    const video = document.querySelector('video');
    if (video) {
        video.play().catch(() => { });
    }

    const audio = new Audio('assets/audio/song.mp3');
    audio.volume = 0.05;
    audio.play().catch(() => { });
};

const clearCursor = () => {
  return $('span').siblings('.typed-cursor').css('opacity', '0');
};
