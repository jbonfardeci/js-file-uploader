# JS File Uploader
A vanilla JavaScript, HTML5, AJAX, base64 file uploader. Click or drag-n-drop. Handles multiple file uploads. No frills just JS.

Tested with Chrome, Opera, FireFox, and IE 10. 

Usage: 
```
var up = new FileUploader({
    
    // string | element
    element: 'js-file-uploader' 
    
    // change to your site's server-side file upload handler 
    , url: 'https://mysite.com/api/some-method' 
      
      // extensions allowed by default - you can override these
    , allowedExtensions: ['xlsx', 'xls', 'txt', 'rtf', 'zip', 'pdf', 'doc', 'docx', 'jpg', 'gif', 'png', 'ppt', 'tif', 'pptx', 'csv'] 
        
      // your callback function - what to do after an upload is complete 
    , callback: function(response){ 
        // do something
    }
});
```

After instantiation, do you need to change the URL or querystring parameters before/after a file upload?
Change: 
```
up.config.url = 'https://mysite.com/api/some-method?id=42'
```

Need to add your own custom AJAX file upload function?
Change:
```
FileUploader.prototype.uploadFileAsync = function myCustomFn(fileName, base64File) {
  // your custom code
};
```

License: MIT
