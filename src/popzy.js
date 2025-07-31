Popzy.stack = [];
Popzy.baseZIndex = 1000;

// Hàm khởi tạo modal
function Popzy(options = {}) {
  if (options.templateId) {
    // Lấy template từ DOM

    this.template = document.querySelector(`#${options.templateId}`);
    if (!this.template) {
      throw new Error(
        `Template with id "${options.templateId}" does not exist`
      );
    }
  }

  if (!options.content && !options.templateId) {
    console.error("You must provide one of 'content' or 'templateId'.");
    return;
  }

  if (options.content && options.templateId) {
    options.templateId = null;
    console.warn(
      "Both 'content' and 'templateId' are specified. 'content' will take precedence, and 'templateId' will be ignored."
    );
  }
  // Destructure các option đầu vào và gán giá trị mặc định nếu không có
  this.opts = Object.assign(
    {
      destroyOnclose: true, // Modal có bị xóa khỏi DOM sau khi đóng không
      classCss: [], // Các class CSS tùy chọn cho modal
      footer: false, // Có hiển thị footer không
      closeMethods: ["button", "backdrop", "escape"], // Cách đóng modal
      enableScrollLock: true,
      scrollLockTarget: () => document.body,
    },
    options
  );

  const { closeMethods } = this.opts;
  // Kiểm tra phương thức đóng nào được cho phép
  this._allowButton = closeMethods.includes("button");
  this._allowBackdrop = closeMethods.includes("backdrop");
  this._allowEscape = closeMethods.includes("escape");

  // Mảng chứa các nút trong footer
  this._footerButtons = [];

  this._handleEsc = this._handleEsc.bind(this);
}

// Hàm xử lý khi nhấn phím ESC
Popzy.prototype._handleEsc = function (e) {
  const lastStack = Popzy.stack.at(-1);

  if (e.key === "Escape" && this === lastStack) {
    this.close();
  }
};

// Hàm dọn dẹp modal khỏi DOM
Popzy.prototype._clearUp = function (destroy) {
  if (!this._backdrop) return;
  if (destroy) {
    this._backdrop.remove(); // Xóa backdrop
    this._backdrop = null;
    this._modalFooter = null;
  }

  // Bỏ scroll-lock và padding
  if (!Popzy.stack.length && this.opts.enableScrollLock) {
    const target = this.opts.scrollLockTarget();

    if (this._hasScrollBarWith(target)) {
      target.classList.remove("popzy__no-scroll");
      target.style.paddingRight = "";
    }
  }

  // Hủy lắng nghe phím Escape
  if (this._allowEscape) {
    document.body.removeEventListener("keydown", this._handleEsc);
  }
};

Popzy.prototype._hasScrollBarWith = function (target) {
  if ([document.documentElement, document.body].includes(target)) {
    return (
      document.documentElement.scrollHeight >
        document.documentElement.clientHeight ||
      document.body.scrollHeight > document.body.clientHeight
    );
  }
  return target.scrollHeight > target.clientHeight;
};

// Hàm tạo button
Popzy.prototype._createButton = function (title, className, callback) {
  const button = document.createElement("button");
  button.innerHTML = title;
  button.className = className;
  button.addEventListener("click", callback);
  return button;
};

Popzy.prototype._updateZIndex = function () {
  Popzy.stack.forEach((modal, index) => {
    if (modal._backdrop) {
      modal._backdrop.style.zIndex = Popzy.baseZIndex + index * 2;
      modal._backdrop.querySelector(".popzy__container").style.zIndex =
        Popzy.baseZIndex + index * 2 + 1;
    }
  });
};

// Xây dựng giao diện modal
Popzy.prototype._build = function () {
  this._backdrop = document.createElement("div");
  this._backdrop.className = "popzy__backdrop";

  const container = document.createElement("div");
  container.className = "popzy__container";

  // Thêm các class tùy chỉnh nếu có
  if (Array.isArray(this.opts.classCss)) {
    this.opts.classCss.forEach((cssClass) => {
      if (typeof cssClass === "string" && cssClass.trim()) {
        container.classList.add(cssClass.trim());
      } else {
        console.warn(`Invalid class name: ${cssClass}`);
      }
    });
  }

  this.modalContent = document.createElement("div");
  this.modalContent.className = "popzy__content";

  // Nhân bản nội dung từ template

  this.content = this.opts.content;
  const contentNode = this.content
    ? document.createElement("div")
    : this.template.content.cloneNode(true);

  if (this.content) {
    contentNode.innerHTML = this.content;
  }
  this.modalContent.append(contentNode);
  container.append(this.modalContent);

  // Nếu có footer thì tạo footer
  if (this.opts.footer) {
    this._modalFooter = document.createElement("div");
    this._modalFooter.className = "popzy__footer";

    // Gán nội dung HTML nếu có
    if (this._footerContent) {
      this._modalFooter.innerHTML = this._footerContent;
    }

    // Thêm các nút vào footer
    this._footerButtons.forEach((button) => {
      this._modalFooter.append(button);
    });

    container.append(this._modalFooter);
  }

  // Thêm container vào backdrop và gắn vào DOM
  this._backdrop.append(container);
  document.body.append(this._backdrop);

  // Nếu cho phép, thêm nút đóng (dấu ×)
  if (this._allowButton) {
    const button = this._createButton("&times;", "popzy__close", () =>
      this.close()
    );
    container.append(button);
  }
};

Popzy.prototype.setContent = function (content) {
  this.content = content;

  if (this.modalContent) {
    this.modalContent.innerHTML = this.content;
  }
};

// Cập nhật nội dung HTML cho footer
Popzy.prototype.setFooterContent = function (html) {
  this._footerContent = html;
  if (this._modalFooter) {
    this._modalFooter.innerHTML = this._footerContent;
  }
};

// Thêm button vào footer
Popzy.prototype.addFooterButton = function (title, className, callback) {
  const button = this._createButton(title, className, callback);
  this._footerButtons.push(button);
};

// Mở modal
Popzy.prototype.open = function () {
  if (!this._backdrop) this._build();
  if (!Popzy.stack.includes(this)) {
    Popzy.stack.push(this);
  } else {
    // Nếu modal đã có trong stack, đưa nó lên đầu
    const index = Popzy.stack.indexOf(this);
    Popzy.stack.splice(index, 1);
    Popzy.stack.push(this);
  }
  this._updateZIndex();
  // Cho animation chạy sau 1 khoảng ngắn
  setTimeout(() => {
    this._backdrop.classList.add("show");
  }, 5);

  // Nếu cho phép click vào backdrop để đóng
  if (this._allowBackdrop) {
    this._backdrop.addEventListener("click", (e) => {
      if (e.target === this._backdrop) {
        this.close();
      }
    });
  }

  // Nếu cho phép ESC, lắng nghe phím
  if (this._allowEscape) {
    document.body.addEventListener("keydown", this._handleEsc);
  }

  // Chặn scroll body

  if (Modal.stack.length === 1 && this.opts.enableScrollLock) {
    const target = this.opts.scrollLockTarget();
    if (this._hasScrollBarWith(target)) {
      target.classList.add("popzy__no-scroll");

      const paddingRight = parseInt(getComputedStyle(target).paddingRight);
      const scrollWidth = paddingRight + this._getScrollBarWidth();

      // Thêm padding để không bị giật layout nếu có scrollbar
      if (scrollWidth > 0) {
        target.style.paddingRight = scrollWidth + "px";
      }
    }
  }

  // Gọi callback mở nếu có
  if (typeof this.opts.onOpen === "function") this.opts.onOpen();

  return this._backdrop;
};

// Đóng modal
Popzy.prototype.close = function (destroy = this.opts.destroyOnclose) {
  if (!this._backdrop) return;

  // Gọi callback đóng nếu có
  if (typeof this.opts.onClose === "function") this.opts.onClose();

  // Gỡ lớp show để chạy animation ẩn
  this._backdrop.classList.remove("show");

  const index = Popzy.stack.indexOf(this);
  if (index !== -1) {
    Popzy.stack.splice(index, 1);
  }

  this._updateZIndex();

  // Sau khi transition kết thúc, gọi hàm dọn dẹp
  this._backdrop.addEventListener(
    "transitionend",
    () => this._clearUp(destroy),
    {
      once: true,
    }
  );
};

// Hủy modal hoàn toàn (ép destroy = true)
Popzy.prototype.destroy = function () {
  this.close(true);
};

// Tính toán chiều rộng thanh cuộn (scrollbar)
Popzy.prototype._getScrollBarWidth = function () {
  if (this._getScrollBarWidth.value) return this._getScrollBarWidth.value;

  const div = document.createElement("div");

  Object.assign(div.style, {
    position: "absolute",
    top: "-99999px",
    overflow: "scroll",
  });

  document.body.append(div);

  const getScrollWidth = div.offsetWidth - div.clientWidth;
  this._getScrollBarWidth.value = getScrollWidth;

  document.body.removeChild(div);
  return getScrollWidth;
};
