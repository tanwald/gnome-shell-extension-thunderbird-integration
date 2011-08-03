/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/**
 * Helper function for debugging.
 * @param message: Message that is to be displayed.
 */
function prompt(message) {
    var promptService = Components
        .classes["@mozilla.org/embedcomp/prompt-service;1"]
        .getService(Components.interfaces.nsIPromptService);
    promptService.alert(null, "Gnome-Shell-Integration Alert", message);
}

var NewMsgListener = {    
    
    _NEW_MSG_FLAG: 0x00010000,
    
    /**
     * Function that is triggered when a new message arrives.
     * @param header: Header of the new message.
     */
    msgAdded: function(header) { 
        if (header.flags & this._NEW_MSG_FLAG) {
            [author, subject] = this.prepareMsg(header);
            this.sendDBusMsg(author, subject);
        }
    },
    
    /**
     * Extracts and converts author and subject from the header
     * into UTF-8-Strings. 
     * @param header: Header of the new message
     * @return: [ UTF-8-String, UTF-8-String ]
     */
    prepareMsg: function(header) {
        var unicodeConverter = Components
            .classes["@mozilla.org/intl/scriptableunicodeconverter"]
            .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
        unicodeConverter.charset = "UTF-8";
        var author = unicodeConverter
            .ConvertFromUnicode(header.mime2DecodedAuthor) 
            + unicodeConverter.Finish();
        var subject = unicodeConverter
            .ConvertFromUnicode(header.mime2DecodedSubject) 
            + unicodeConverter.Finish();
        return [author, subject];
    },

    /**
     * Delegates to the Python-Script that sends the DBus-Message.
     * @param author: Author of the new message.
     * @param subject: Subject of the new message.
     */
    sendDBusMsg: function(author, subject) {
        var file = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsILocalFile);
        var process = Components.classes["@mozilla.org/process/util;1"]
            .createInstance(Components.interfaces.nsIProcess);
        var path = '';
        
        try { 
            const DirService = new Components
                .Constructor("@mozilla.org/file/directory_service;1", 
                             "nsIProperties");
            path = (new DirService()).get("ProfD", 
                                          Components.interfaces.nsIFile).path; 
            path = path + "/extensions/gnome-shell-integration@tanwald.net"
                + "/chrome/content/gnome-shell-integration.py";
        } catch(e) {
            prompt("Error while trying to locate the profile directory\n" + e);
            return;
        }
        
        try {
            file.initWithPath(path);
            process.init(file);
            var args = [author, subject];
            var exitcode = process.run(true, args, args.length);
        } catch(e) {
            prompt("Error while trying to send a DBus message\n" + e);
            return;
        }
    }
};

var GnomeShellIntegration = {
    /**
     * Initializes the extension.
     */
    onLoad: function() {
        this.initialized = true;
        this.addNewMsgListener();
    },
    
    /**
     * Adds the NewMsgListener.
     */
    addNewMsgListener: function() {
        var notificationService = Components
            .classes["@mozilla.org/messenger/msgnotificationservice;1"]
            .getService(Components.interfaces.nsIMsgFolderNotificationService);
        notificationService.addListener(NewMsgListener, 
                                        notificationService.msgAdded);
    }
};

window.addEventListener("load", GnomeShellIntegration.onLoad(), false);

