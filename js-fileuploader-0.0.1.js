

/**
 * JS File Uploader
 * by John Bonfardeci <john.bonfardeci@gmail.com>
 * 2017-03-01
 * 
 * Description: A vanilla JavaScript, HTML5, AJAX, base64 file uploader. Click or drag-n-drop. Handles multiple file uploads. No frills just JS. 
 * 
 * Dependencies: Cafe.js (https://github.com/jbonfardeci/CafeJS) included.
 * 
 * Usage: 
 * ```
 * var up = new FileUploader({
 *       element: 'js-file-uploader' // string | element
 *       , url: 'https://mysite.com/api/some-method' // change to your site's server-side file upload handler 
 *         // defaults - you can override these
 *       , allowedExtensions: ['xlsx', 'xls', 'txt', 'rtf', 'zip', 'pdf', 'doc', 'docx', 'jpg', 'gif', 'png', 'ppt', 'tif', 'pptx', 'csv'] 
 *         // your callback function - what to do after an upload is are complete 
 *       , callback: function(response){ 
 *              // do something
 *         }
 *   });
 * ```
 * 
 * License: MIT
 */
var FileUploader = (function () {
    function FileUploader(args) {
        var self = this;

        if (!(this instanceof FileUploader)) {
            throw 'FileUploader must be instantiated with `new`.';
        }

        this.config = {
            element: 'js-file-uploader',
            url: undefined,
            callback: undefined,
            allowedExtensions: ['xlsx', 'xls', 'txt', 'rtf', 'zip', 'pdf', 'doc', 'docx', 'jpg', 'gif', 'png', 'ppt', 'tif', 'pptx', 'csv'],
            template: this.template
        };

        for (var p in args) {
            this.config[p] = args[p];
        }

        this.progress = 0;
        var container = typeof(this.config.element) == 'string' ? document.getElementById(this.config.element) : element;
        if (!container) {
            throw 'The file upload target element is undefined.';
            return;
        }

        container.innerHTML = this.template;
        var fileInput = container.querySelector('input[type="file"]');
        fileInput.onchange = function (e) {
            self.fileHandler(e, self);
        };

        var btnUpload = container.querySelector('button.btn-file-uploader');
        btnUpload.onclick = function (e) {
            self.onSelect(e, self);
        };

        container.ondrop = function (e) {
            self.onDrop(e, self);
        };
        container.ondragenter = self.cancel;
        container.ondragover = self.cancel;

        var fileList = container.querySelector('ul.file-upload-list');

        this.container = container;
        this.fileInput = fileInput;
        this.btnUpload = btnUpload;
        this.fileList = fileList;
        this.observables = {};

    };

    /**
     * HTML file upload template
     */
    FileUploader.prototype.template = '<input type="file" class="file-uploader" multiple style="display:none;" />'
        + '<button class ="btn btn-file-uploader">Click or Drop Files Here</button>'
        + '<ul class="file-upload-list"></ul>'
    ;

    /**
     * File input event handler
     * @param e: Event
     * @param self: FileUploader
     * @returns void
     */
    FileUploader.prototype.fileHandler = function (e, self) {
        self = self || this;
        if (!(self instanceof FileUploader)) {
            throw 'Lost scope of this!';
        }

        var files = self.fileInput.files;
        self.readFilesAsync(files);
    };

    /**
     * Event handler for upload button. Calls file input click event.
     * @param e: Event
     * @param self: FileUploader
     * @returns void
     */
    FileUploader.prototype.onSelect = function (e, self) {
        self = self || this;
        if (!(self instanceof FileUploader)) {
            throw 'Lost scope of this!';
        }

        self.cancel(e);
        self.fileInput.click();
    };

    /**
     * Dropzone event handler
     * @param e: Event
     * @param self: FileUploader
     * @returns void
     */
    FileUploader.prototype.onDrop = function (e, self) {
        self = self || this;
        if (!(self instanceof FileUploader)) {
            throw 'Lost scope of this!';
        }

        self.cancel(e);
        var dt = (e.originalEvent || e).dataTransfer;
        var files = dt.files;
        if (!!!files) {
            console.warn('Error in FileUploader - event.dataTransfer.files is ' + typeof files);
            return false;
        }
        else {
            self.readFilesAsync(files);
        }
    };

    /**
     * Read files asynchronously.
     * @param files: File[]
     * @returns void
     */
    FileUploader.prototype.readFilesAsync = function (files) {
        var self = this;
        if (!(self instanceof FileUploader)) {
            throw 'Lost scope of this!';
        }

        this.fileList.innerHTML = '';

        var asyncFns = [];
        var fileArray = Array.prototype.slice.call(files, 0);

        // create async upload function for each file in files
        fileArray.map(function (file, i) {

            var fileName = self.cleanFileName(file);
            var valid = self.isValidExtension(fileName);
            var li = document.createElement('li');
            
            li.innerHTML = fileName + (valid ? '' : '<strong>Only these file types are allowed: ' + self.config.allowedExtensions.join(', ') + '</strong>');
            self.fileList.appendChild(li);

            if(valid){
                self.observables[fileName] = li;
                asyncFns.push(function () {
                    self.readFileAsync(file, fileName);
                    self.cafe.next(true); //execute next upload
                });
            }
        });

        self.cafe = new Cafe(asyncFns);
        self.cafe.next(true);
    };

    /**
     * Read a file asynchronously.
     * @param self: FileUploader
     * @param fileName: string
     * @returns void
     */
    FileUploader.prototype.readFileAsync = function (file, fileName) {
        var self = this;
        var reader = self.getFileReader(self, function (base64File) {
            self.uploadFileAsync(fileName, base64File);
        }, function(e, progress){
            var node = self.observables[fileName];
            node.innerHTML = fileName + ' &ndash; ' + progress + '%';
        });

        reader.readAsDataURL(file); 
    };

    /**
     * Upload a file asynchronously
     * @param fileName: string
     * @param base64File: string (base64)
     * @returns void
     */
    FileUploader.prototype.uploadFileAsync = function (fileName, base64File) {
        var self = this;

        var payload = {
            fileName: fileName,
            base64: base64File
        };

        // send file via AJAX
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open('POST', self.config.url);
        xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xmlhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                var res = JSON.parse(this.responseText);

                if (self.config.callback) {
                    self.config.callback(res);
                }

                // show file upload completed status
                self.observables[fileName].innerHTML = fileName + ' &ndash; uploaded.';
            }
        };
        xmlhttp.send(JSON.stringify(payload));
    };

    /**
     * Get instance of FileReader with event handlers set.
     * @param self: FileUploader instance
     * @param callback: Function
     * @param progressCallback?: Function (optional)
     * @returns FileReader
     */
    FileUploader.prototype.getFileReader = function (self, callback, progressCallback) {
        self = self || this;
        if (!(self instanceof FileUploader)) {
            throw 'Lost scope of this!';
        }

        var reader = new FileReader();
        reader.onerror = function errorHandler(e) {
            var errorMsg = undefined;
            switch (e.target.error.code) {
                case e.target.error.NOT_FOUND_ERR:
                    errorMsg = 'File Not Found!';
                    break;
                case e.target.error.NOT_READABLE_ERR:
                    errorMsg = 'File is not readable.';
                    break;
                case e.target.error.ABORT_ERR:
                    break;
                default:
                    errorMsg = 'An error occurred reading this file.';
            };

            if (errorMsg) {
                alert(errorMsg);
            }
        };
        reader.onprogress = function (e) { 
            var progress = e.lengthComputable ? Math.round((e.loaded / e.total) * 100) : 0;
            if(progressCallback){
                progressCallback(e, progress);
            }
        };
        reader.onabort = function (e) {
            alert('File upload cancelled.');
        };
        reader.onload = function (e) {
            var base64str = e.target.result;
            if(base64str.indexOf(',') > -1){
                base64str = base64str.split(',')[1];
            }
            callback(base64str);
        };
        return reader;
    };

    /**
     * Reusable event handler to call event.reventDefault or event.stopPropagation. 
     * @param e: Event
     * @returns void 
     */
    FileUploader.prototype.cancel = function (e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        if (e.stopPropagation) {
            e.stopPropagation();
        }
    };

     /**
     * Clean 
     */
    FileUploader.prototype.cleanFileName = function (file) {
        return file.name.replace(/[^a-zA-Z0-9_\-\.]/g, '');
    };

    /**
     * Check for valid file extensions.
     * @param fileName: string
     * @return Boolean
     */
    FileUploader.prototype.isValidExtension = function (fileName) {
        var ext = /\.\w{2,4}$/.exec(fileName);
        if (!!!ext) {
            return false;
        }
        ext = ext[0];
        var rootName = fileName.replace(new RegExp(ext + '$'), '');
        var allowedExtension = new RegExp("^(\\.|)(" + this.config.allowedExtensions.join('|') + ")$", "i").test(ext);
        return allowedExtension;
    };

    /**
     * Download a base64 file.
     * If the server response sends back a base64 file, force the browser to download it in your callback function.
     * @param bas64: stringify
     * @param: fileName: string
     * @returns void
     */
    FileUploader.prototype.downloadFile = function (base64, fileName) {
        var a = document.createElement('a');
        a.setAttribute('href', 'data:application/pdf;base64,' + base64);
        a.setAttribute('download', fileName);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return FileUploader;
})();


/**
 * Cascading Asynchronous Function Execution (CAFE)
 * Description: Use CAFE to handle asynchronous JavaScript functions in strict sequence.
 * by John Bonfardeci <john.bonfardeci@gmail.com>
 * 2015-04-21
 * https://github.com/jbonfardeci/CafeJS
 * License: MIT
 */
window.Cafe = (function () {
    function Cafe(asyncFns) {
        if (asyncFns === void 0) { asyncFns = undefined; }
        if (asyncFns) {
            this.asyncFns = asyncFns;
        }
        return this;
    }
    Cafe.prototype.start = function (msg) {
        if (msg === void 0) { msg = undefined; }
        this.next(true, msg);
    };
    Cafe.prototype.complete = function (fn) {
        this._complete = fn;
        return this;
    };
    Cafe.prototype.fail = function (fn) {
        this._fail = fn;
        return this;
    };
    Cafe.prototype.finally = function (fn) {
        this._finally = fn;
        return this;
    };
    Cafe.prototype.next = function (success, msg, args) {
        if (success === void 0) { success = true; }
        if (msg === void 0) { msg = undefined; }
        if (args === void 0) { args = undefined; }
        if (!this.asyncFns) {
            throw "Error in Cafe: The required parameter `asyncFns` of type (Array<Function>) is undefined. Don't forget to instantiate Cafe with this parameter or set its value after instantiation.";
        }
        if (this._complete) {
            this._complete(msg, success, args);
        }
        if (!success) {
            if (this._fail) {
                this._fail(msg, success, args);
            }
            return;
        }
        if (this.asyncFns.length == 0) {
            if (this._finally) {
                this._finally(msg, success, args);
            }
            return;
        }
        this.asyncFns.shift()(this, args);
    };
    return Cafe;
}());