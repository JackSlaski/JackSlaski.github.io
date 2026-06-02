'use strict';

const timeouts = [];

const mobileAndTabletCheck = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

$(document).ready(() => {
  doIntroAnim()

  if (mobileAndTabletCheck()) {
    app.shouldIgnoreVideo = true;
  }

    app.titleChanger(['J', 'Ja', 'Jac', 'Jack', 'Jack S', 'Jack Sl', 'Jack Sla', 'Jack Slas', 'Jack Slask', 'Jack Slaski', 'Jack Slaski', 'Jack Slaski', 'Jack Slaski', 'Jack Slaski', 'Jack Slask', 'Jack Slas', 'Jack Sla', 'Jack Sl', 'Jack S', 'Jack', 'Jac', 'Ja']);
});

if ($.cookie('videoTime') && app.videoElement) {
  app.videoElement.currentTime = $.cookie('videoTime');
}

if ($.cookie('videoTime') && app.audioElement) {
  app.audioElement.currentTime = $.cookie('videoTime');
}

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
    audio.volume = 1;
    audio.play().catch(() => { });
};

const clearCursor = () => {
  return $('span').siblings('.typed-cursor').css('opacity', '0');
};

