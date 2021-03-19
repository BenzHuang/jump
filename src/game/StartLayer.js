import { getTargetBoxPos, direction, caleRelateTargetPos, setPivot, getCollisionRegion, getDistance } from './utils';
import inside from 'point-in-polygon';
import EndLayer from './EndLayer';

class StartLayer extends Tiny.Container {
  constructor() {
    super();
    this.init();
    this.handleTouch();
  }

  init() {
    this.scores = 0;
    //this.scoreText = new Tiny.Text('Score:' + this.scores);
    //this.addChild(this.scoreText);
    //this.background = this.createBackground();
    this.ant = this.createAnt();
    this.currentBox = this.createBox();
    // 将蚂蚁放到 box 组中
    this.currentBox.addChild(this.ant);
    // 位置也得调整下
    this.ant.setPosition(100, 50);
    this.isJumping = false; // 在跳的过程中，不能再跳
    this.targetBoxDirection = direction.right; // 下一个盒子的方向
    this.targetBoxDelta = 200; // 下一个盒子的距离
    this.numInOneDirection = 2; // 在一个方向上的连续盒子数量

    // 统一管理所有 box
    this.boxes = [];
    this.boxes.push(this.currentBox);

    // 再来一个盒子
    this.targetBox = this.dropBox();

    //this.background.addChild(this.boxes);
  }

  createBackground() {
    //背景
    const backgroundImg = Tiny.Sprite.fromImage(Tiny.resources.backgroundPng);
    backgroundImg.name = 'background';
    //backgroundImg.width = Tiny.WIN_SIZE.width;
    this.addChild(backgroundImg);
    return backgroundImg;
  }

  reset() {
    // 清空所有元素
    while (this.children.length > 0) {
      const b = this.children[this.children.length - 1];
      b.parent.removeChild(b);
    }

    // 恢复屏幕坐标
    this.setPosition(0, 0);

    // 重新加载初始元素
    this.init();
  }

  createAnt() {
    // 使用图片生成一个 sprite
    const ant = Tiny.Sprite.fromImage(Tiny.resources.dinosaursPng);
    // canvas 默认旋转中心是在左上角，这样定位起来比较麻烦，所以这里将蚂蚁的脚底作为定位中心
    ant.setPivot(ant.width / 2, ant.height);
    // 先随便定个位置吧
    ant.setPosition(100, 300);
    ant.name = 'ant';

    // 加到 container 中来渲染
    this.addChild(ant);

    return ant;
  }

  createBox() {
    const box = Tiny.Sprite.fromImage(Tiny.randomFromArray(Tiny.resources.boxArrayPng));
    box.setPivot(box.width / 2, box.height);
    box.setPosition(100, 1000);
    box.name = 'box';

    // 如果使用 addChild，会发现盒子将蚂蚁盖起来了，所以使用 addChildAt 来将盒子放到蚂蚁下面
    this.addChildAt(box, 1);
    return box;
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

    canvas.addEventListener(supportTouch ? 'touchend' : 'mouseup', () => {
      // 蚂蚁恢复
      this.compressRestore();

      // 跳的过程中就不能再跳了
      if (this.isJumping) return;
      this.isJumping = true;

      const deltaTime = +Date.now() - this.pressTime;
      var targetBoxDelta = 0.8 * deltaTime;
      const maxTargetDelta = 600;
      if (targetBoxDelta > maxTargetDelta) {
        targetBoxDelta = maxTargetDelta;
      }

      // var targetBoxDelta = 270;
      this.jump(targetBoxDelta, this.targetBoxDirection, () => {
        // 跳完后
        this.isJumping = false;

        const jumpResult = this.jumpResult();
        if (jumpResult.isInside) {
          this._jumpSuccess();
        } else {
          const dropAction = jumpResult.dropAction;
          console.log(dropAction);
          this._jumpFail(dropAction);
        }
      });
    });
  }

  _jumpSuccess() {
    // 因为要更换 ant 的 group，所以要计算 ant 相对 targetBox 的位置
    var { x, y } = caleRelateTargetPos(this.ant, this.targetBox);
    this.ant.setPosition(x, y);
    this.targetBox.addChild(this.ant);

    this.currentBox = this.targetBox;
    this.boxes.push(this.currentBox);
    //this.backgroup.addChild(this.boxes);

    // 确定下一个盒子的方向和位移
    this.setTargetBoxDirectionAndDelta();

    // 移动屏幕
    this.sceneMove();
    //加分
    this.scores++;
    //this.removeChild(this.scoreText);
    //this.scoreText = new Tiny.Text('Score:' + this.score);
    //this.scoreText.setPosition(0, 0);
    //this.addChild(this.scoreText);
    // 再来一个盒子
    this.targetBox = this.dropBox();
  }

  _jumpFail(dropAction) {
    this.antFall(dropAction, () => {
      this.reset();
      Tiny.app.replaceScene(new EndLayer(this.scores));
    });
  }

  jump(targetDelta, direction, onComplete) {
    setPivot(this.ant, this.ant.width / 2, this.ant.height / 2);

    const maxHeight = 200; // 跳的最高点

    const ant = this.ant; // 上面创建的蚂蚁实例
    const originX = ant.position.x;
    const originY = ant.position.y;
    const targetPos = getTargetBoxPos(this.ant.position, targetDelta, direction);
    const deltaX = targetPos.x - originX;

    const tween = new Tiny.TWEEN.Tween({ // 起始值
      rotation: 0,
      x: originX,
      y: originY,
    }).to({ // 结束值
      rotation: [180 * direction, 320 * direction, 360 * direction], // 旋转 1 周
      x: [originX + deltaX * 0.5, originX + deltaX * 0.8, originX + deltaX],
      y: [targetPos.y - maxHeight * 0.5, targetPos.y - maxHeight * 0.2, targetPos.y],
    }, 1000).onUpdate(function() {
      // 设置位置
      ant.setPosition(this.x, this.y);
      // 需要将角度转换为弧度，然后设置旋转
      ant.setRotation(Tiny.deg2radian(this.rotation));
    }).onComplete(function () {
      // 动画结束的回调
      onComplete();
    });

    // 动画开始
    tween.start();
  }

  jumpResult() {
    const antRegion = this.getAntRegion();
    const boxRegion = this.getBoxRegion();

    var isInside = inside(antRegion, boxRegion);

    var dropAction = '';
    if (!isInside) {
      dropAction = this.getDropAction(antRegion, boxRegion);
    }

    return {
      isInside,
      dropAction,
    };
  }

  getAntRegion() {
    var { x, y, width, height } = getCollisionRegion(this.ant);
    x -= this.position.x;
    y -= this.position.y;

    const realX = x + width / 2 + 10; // 底部中点然后再微调下
    const realY = y + height;

    //显示蚂蚁中间点
    //this._drawAntRegion(realX, realY);

    return [realX, realY];
  }
  _drawAntRegion(x, y) {
    var mask = new Tiny.Graphics();
    mask.lineStyle(4, 0x66FF33, 1);
    mask.drawCircle(x, y, 1);
    mask.endFill();

    this.addChild(mask);
  }

  getBoxRegion() {
    var {x, y, width} = getCollisionRegion(this.targetBox);
    x -= this.position.x;
    y -= this.position.y;
    var delta = 10; // 离边距需要隔一点距离

    console.log('x=' + x);
    console.log('y=' + y);
    console.log('width=' + width);
    var result = [
      [x + delta, y + delta], // 左上
      [x + width - delta, y], // 右上
      [x + width - delta, y + 130], // 右下
      [x + delta, y + 130], // 左下
    ];
    console.log('result=' + result);

    //显示落地有效范围点
    //this._drawBoxRegion(result);

    return result;
  }
  _drawBoxRegion(result) {
    var path = [];
    result.forEach((r) => {
      path = path.concat(r);
    });
    path = path.concat(result[0]);

    var mask = new Tiny.Graphics();
    mask.lineStyle(4, 0x66FF33, 1);
    console.log('path:');
    console.log(path);
    mask.drawPolygon(path);
    mask.endFill();

    this.addChild(mask);
  }

  getDropAction(antRegion, boxRegion) {
    // 垂直下落
    var dropAction = 'drop';

    var r = this.ant.width / 2; // 底部半径
    var d1, d2;
    // 向右上方跳跃
    if (this.targetBoxDirection === direction.right) {
      d1 = getDistance(antRegion, boxRegion[0], boxRegion[1]);
      d2 = getDistance(antRegion, boxRegion[2], boxRegion[3]);
      // 如果离右边更近
      if (d1 < d2) {
        // 如果与右边缘的距离小于底部半径
        if (d1 < r) {
          // 在右侧边缘
          dropAction = 'right';
        } else {
          // 在右侧垂直下落
          dropAction = 'right-drop';
        }
      } else {
        if (d2 < r) {
          // 在左侧边缘
          dropAction = 'left';
        } else {
          // 在左侧垂直下落
          dropAction = 'left-drop';
        }
      }
    } else {
      // 向左上方跳跃
      d1 = getDistance(antRegion, boxRegion[0], boxRegion[3]);
      d2 = getDistance(antRegion, boxRegion[1], boxRegion[2]);
      // 如果离上边更近
      if (d1 < d2) {
        // 如果与上边缘的距离小于底部半径
        if (d1 < r) {
          // 在上边缘
          dropAction = 'top';
        } else {
          // 在上方垂直下落
          dropAction = 'top-drop';
        }
      } else {
        if (d2 < r) {
          // 在下边缘
          dropAction = 'bottom';
        } else {
          // 在下方垂直下落
          dropAction = 'bottom-drop';
        }
      }
    }

    return dropAction;
  }

  // 蚂蚁摔倒
  antFall(dropAction, onComplete) {
    const ant = this.ant;
    setPivot(ant, ant.width / 2, ant.height);
    ant.setRotation(0);

    var action;
    switch (dropAction) {
      case 'right':
        action = Tiny.RotateTo(1000, {rotation: Tiny.deg2radian(55)});
        break;
      case 'left':
        action = Tiny.RotateTo(2000, {rotation: Tiny.deg2radian(-125)});
        break;
      case 'top':
        action = Tiny.RotateTo(1000, {rotation: Tiny.deg2radian(-55)});
        break;
      case 'bottom':
        action = Tiny.RotateTo(2000, {rotation: Tiny.deg2radian(125)});
        break;
      case 'right-drop':
      case 'top-drop':
        ant.parent.setChildIndex(ant, 0); // TODO
        action = Tiny.MoveBy(500, {x: 0, y: 50});
        break;
      case 'left-drop':
      case 'bottom-drop':
      case 'drop':
        action = Tiny.MoveBy(500, {x: 0, y: 50});
        break;
      default:
        onComplete && onComplete();
        break;
    }

    if (action) {
      if (onComplete) {
        action.onComplete = onComplete;
      }
      ant.runAction(action);
    }
  }

  compress() {
    // 动画 持续 1000ms，y 轴缩放到 0.7
    this.currentBox.runAction(Tiny.ScaleTo(1000, {
      scaleY: 0.7,
    }));
  }

  compressRestore() {
    this.currentBox.removeActions(); // 移除动画

    const action = Tiny.ScaleTo(500, Tiny.scale(1));
    action.setEasing(Tiny.TWEEN.Easing.Bounce.Out); // 回弹效果
    this.currentBox.runAction(action);
  }

  setTargetBoxDirectionAndDelta() {
    this.numInOneDirection -= 1;
    if (this.numInOneDirection <= 0) {
      this.targetBoxDirection = -this.targetBoxDirection; // 反向
      this.numInOneDirection = Tiny.randomInt(1, 3);
    }

    this.targetBoxDelta = Tiny.randomInt(150, 300);
  }

  dropBox() {
    var box = Tiny.Sprite.fromImage(Tiny.randomFromArray(Tiny.resources.boxArrayPng));
    box.setPivot(box.width / 2, box.height);
    box.name = 'box';

    const targetPos = getTargetBoxPos(this.currentBox.position, this.targetBoxDelta, this.targetBoxDirection);

    const deltaY = 100; // 从 deltaY 开始掉落
    box.setPosition(targetPos.x, targetPos.y - deltaY); // 设置初始位置

    // 下落动画
    const action = Tiny.MoveBy(500, {
      y: deltaY,
    });
    action.setEasing(Tiny.TWEEN.Easing.Bounce.Out); // 盒子落地有个弹性效果
    box.runAction(action);

    this.addChildAt(box, 1);
    return box;
  }

  sceneMove() {
    const targetPos = getTargetBoxPos(this.position, this.targetBoxDelta, this.targetBoxDirection);
    const action = Tiny.MoveBy(500, {
      x: this.position.x - targetPos.x,
      y: this.position.y - targetPos.y,
    });

    action.onComplete = (tween, object) => {
      const scenePostion = this.position;

      for (var i = this.boxes.length - 1; i >= 0; i--) {
        const box = this.boxes[i];

        // 屏幕下方的 box 不会再出现了，所以可以删掉，防止内存泄露
        if ((box.y - box.height + scenePostion.y) > Tiny.WIN_SIZE.height) {
          box.parent.removeChild(box);
          this.boxes.splice(i, 1);
        }
      }
    };

    this.runAction(action);
  }
}

export default StartLayer;
