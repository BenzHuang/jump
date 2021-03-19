import StartLayer from './StartLayer';

class EndLayer extends Tiny.Container {
  constructor(scores) {
    super();
    this.init(scores);
    this.handleTouch();
  }

  init(scores) {
    var height = Tiny.WIN_SIZE.height;
    var width = Tiny.WIN_SIZE.width;

    for (var j = 0; j < height / 50; j++) {
      for (var i = 0; i < width / 50; i++) {
        var alltexture = Tiny.TextureCache[Tiny.resources.backgroundPng].clone();
        alltexture.frame = new Tiny.Rectangle(0, 640, 50, 50);
        var backgroundImage = new Tiny.Sprite(alltexture);
        backgroundImage.x = i * 50;
        backgroundImage.y = j * 50;
        this.addChild(backgroundImage);
      }
    }

    var gameOver = new Tiny.Text('Game Over!', {
      font: '140px font',
      tint: '0x5a5816'
    });
    gameOver.setPosition(30, 130);
    gameOver.rotation = -3.14 / 7;
    this.addChild(gameOver);

    var scoreSprite = new Tiny.Text('you scored ' + scores + ' points!', {
      font: '24px font',
      tint: '0x5e96be'
    });
    scoreSprite.setPosition(130, 130);

    var restartBtn = new Tiny.Text('restart', {
      font: '55px font',
      tint: '0x000000'
    });
    restartBtn.x = width / 2 - restartBtn.width / 2;
    restartBtn.y = height - restartBtn.height * 5;

    restartBtn.setEventEnabled(true);
    restartBtn.on('pointerdown', function () {
      Tiny.app.replaceScene(new StartLayer());
    });
    //var tap = new Sprites.getGreenTap();

    // tap.x = width / 2 - tap.width / 2;
    // tap.y = restartBtn.y;
    // this.addChild(tap);

    this.addChild(scoreSprite);
    this.addChild(restartBtn);
  }

  handleTouch() {
    const canvas = Tiny.app.view;
    const supportTouch = 'ontouchstart' in window;

    this.pressTime = +Date.now();
    canvas.addEventListener(supportTouch ? 'touchstart' : 'mousedown', () => {
      this.pressTime = +Date.now();
      // 蚂蚁压缩
      this.compress();
    });
  }
}

export default EndLayer;
