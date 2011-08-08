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

var FolderListener = {
    NEW: Components.interfaces.nsMsgMessageFlags.New,
    READ: Components.interfaces.nsMsgMessageFlags.Read,
    RE: Components.interfaces.nsMsgMessageFlags.HasRe,
    
    /**
     * Extracts and converts author and subject from the header
     * into UTF-8-Strings. 
     * @param header: nsIMsgDBHdr
     * @returns: [ UTF-8-String, UTF-8-String ]
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
        // 'Re'-strings are stripped by Thunderbird and their existence is
        // stored as a flag.
        if (header.flags & this.RE) subject = "Re: " + subject;
        return [author, subject];
    },

    /**
     * Delegates to the Python-Script that sends the DBus-Message.
     * @param args: Arguments for the Python-Script.
     */
    sendDBusMsg: function(args) {
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
            var exitcode = process.run(true, args, args.length);
        } catch(e) {
            prompt("Error while trying to send a DBus message\n" + e);
            return;
        }
    }
};

var NotificationServiceListener = {
    __proto__:  FolderListener,
    
    /**
     * Sends a DBus-Message when a new message arrives.
     * @param header: nsIMsgDBHdr
     */
    msgAdded: function(header) { 
        if (header.flags & this.NEW) {
            [author, subject] = this.prepareMsg(header);
            this.sendDBusMsg(["new", header.messageId, author, subject]);
        }
    },
    
    /**
     * Sends DBus-Messages when messages got deleted.
     * @param headers: nsIArray of nsIMsgDBHdr.
     */
    msgsDeleted: function(headers) { 
        while(headers.hasMoreElements()) {
            var header = headers.getNext();
            this.sendDBusMsg(["deleted", header.messageId]);
        }
    }
};

var MailSessionListener = {
    __proto__:  FolderListener,

    /**
     * Sends a DBus-Message when a message got marked read.
     * @param item: nsIMsgDBHdr
     * @param property: nsIAtom (We are looking for 'Status')
     * @param oldFlag: Old header flag (long).
     * @param newFlag: New header flag (long).
     */
    OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) { 
        if (!(oldFlag & this.READ) && newFlag & this.READ) {
            this.sendDBusMsg(["read", item.messageId]);
        } 
    }
};

var GnomeShellIntegration = {
    /**
     * Registers the FolderListeners at start up.
     */
    onLoad: function() {
        // For new and deleted messages.
        var notificationService = Components
            .classes["@mozilla.org/messenger/msgnotificationservice;1"]
            .getService(Components.interfaces.nsIMsgFolderNotificationService);
        notificationService.addListener(NotificationServiceListener, 
                                        notificationService.msgAdded |
                                        notificationService.msgsDeleted);
        
        // For messages which got marked read.
        var nsIFolderListener = Components.interfaces.nsIFolderListener;
        var mailSession = Components
            .classes["@mozilla.org/messenger/services/session;1"]
            .getService(Components.interfaces.nsIMsgMailSession);
        mailSession.AddFolderListener(MailSessionListener, 
                                      nsIFolderListener.propertyFlagChanged);
    }
};

window.addEventListener("load", GnomeShellIntegration.onLoad(), false);


