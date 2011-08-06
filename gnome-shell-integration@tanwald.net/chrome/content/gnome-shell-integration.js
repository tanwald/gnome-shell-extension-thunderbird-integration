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
    
    /**
     * Sends a DBus-Message when a new message arrives.
     * @param parent: nsIMsgFolder
     * @param item: nsISupports
     */
    OnItemAdded: function(parent, item) { 
        var header = item.QueryInterface(Components.interfaces.nsIMsgDBHdr);
        if (header.flags & this.NEW) {
            [author, subject] = this.prepareMsg(header);
            this.sendDBusMsg(["new", header.messageId, author, subject]);
        }
    },
    
    /**
     * Sends a DBus-Message when a message gets removed.
     * @param parent: nsIMsgFolder
     * @param item: nsISupports
     */
    OnItemRemoved: function(parent, item) { 
        var header = item.QueryInterface(Components.interfaces.nsIMsgDBHdr); 
        this.sendDBusMsg(["removed", header.messageId]);
    },
    
    /**
     * Sends a DBus-Message when a message is marked read.
     * @param item: nsIMsgDBHdr
     * @param property: nsIAtom
     * @param oldFlag: Old header flag (long).
     * @param newFlag: New header flag (long).
     */
    OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) { 
        if (property.toString() == "Status" &&
                !(oldFlag & this.READ) && newFlag & this.READ) {
            this.sendDBusMsg(["read", item.messageId]);
        } 
    },
    
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

var GnomeShellIntegration = {
    /**
     * Registers the FolderListener at start up.
     */
    onLoad: function() {
        this.initialized = true;
        
        var iface = Components.interfaces.nsIFolderListener;
        var flags = iface.added | iface.removed | iface.propertyFlagChanged;
        var mailSession = Components
            .classes["@mozilla.org/messenger/services/session;1"]
            .getService(Components.interfaces.nsIMsgMailSession);

        mailSession.AddFolderListener(FolderListener, flags);
    }
};

window.addEventListener("load", GnomeShellIntegration.onLoad(), false);


