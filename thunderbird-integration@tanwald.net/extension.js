/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

const DBus = imports.dbus;
const Gettext = imports.gettext;
const Lang = imports.lang;
const Shell = imports.gi.Shell;

const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const Util = imports.misc.util;

const ThunderbirdIface = {
    name: 'org.mozilla.thunderbird.DBus',
    path: '/org/mozilla/thunderbird/DBus',
    methods: [],
    signals: [{ name: 'NewMessageSignal',
                inSignature: 'sss' },
              { name: 'ChangedMessageSignal',
                inSignature: 'ss' }]
};

///////////////////////////////////////////////////////////////////////////////
// ThunderbirdProxy ///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function ThunderbirdProxy() {
    this._init();
}

ThunderbirdProxy.prototype = {
    /**
     * Initializes the ThunderbirdProxy by connecting to the SessionBus and
     * registering callbacks for Thunderbird signals.
     */
    _init: function() {
        this._source = null;
        DBus.session.proxifyObject(this, 
                                   ThunderbirdIface.name, 
                                   ThunderbirdIface.path);
        this.connect('NewMessageSignal',
                     Lang.bind(this, this._onNewMsg));
        this.connect('ChangedMessageSignal',
                Lang.bind(this, this._onChangedMsg));
    },

    /**
     * Delegates to the ThunderbirdNotificationSource which is initialized 
     * when the first new message arrives and is destroyed when all messages
     * are acknowledged.  
     * @param id: Thunderbird message id.
     * @param author: Author of the new message.
     * @param subject: Subject of the new message.
     */
    _onNewMsg: function(object, id, author, subject) {
        if (!this._source) {
            this._source = new ThunderbirdNotificationSource();
            this._source.connect('destroy', 
                                 Lang.bind(this, 
                                           function() { 
                                               this._source = null; 
                                           }));
            Main.messageTray.add(this._source);
        }
        this._source.onNewMsg(id, author, subject);
    },
    
    /**
     * Delegates to the ThunderbirdNotificationSource. 
     * @param id: Thunderbird message id.
     * @param event: Event that has triggered 
     * the ChangedMessageSignal (removed or read)
     */
    _onChangedMsg: function(object, id, event) {
        if (this._source) {
            this._source.onChangedMsg(id);
        }
    }
}
DBus.proxifyPrototype(ThunderbirdProxy.prototype, ThunderbirdIface);

///////////////////////////////////////////////////////////////////////////////
// ThunderbirdNotificationSource //////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function ThunderbirdNotificationSource() {
    this._init();
}

ThunderbirdNotificationSource.prototype = {
    __proto__:  MessageTray.Source.prototype,

    /**
     * Initializes the NotificationSource.
     * @override
     */
    _init: function() {
        MessageTray.Source.prototype._init.call(this, 'Thunderbird');
        let appSystem = Shell.AppSystem.get_default();
        this._tbApp = appSystem.get_app('mozilla-thunderbird.desktop');
        this._setSummaryIcon(this.createNotificationIcon());
    },
    
    /**
     * Triggers the notification about new messages and stores the Thunderbird
     * message id.
     * @param id: Thunderbird message id.
     * @param author: Author of the new message.
     * @param subject: Subject of the new message.
     */
    onNewMsg: function(id, author, subject) {
        let title = Gettext.gettext('New Message');
        let message = Gettext.gettext('From') + ': ' 
                      // Strip the email address.
                      + author.replace(/\s<.*/, '\n') 
                      + Gettext.gettext('Subject') + ': ' + subject;
        let notification = new MessageTray.Notification(this, title, message);
        notification.thunderbirdId = id;
        // Notifications should not be removed on click but only when they are
        // marked read or removed within Thunderbird.
        notification.setResident(true);
        this.notify(notification);
    },
    
    /**
     * Removes message which were removed or marked read within Thunderbird.
     * @param id: Thunderbird message id. 
     */
    onChangedMsg: function(id) {
        for (i in this.notifications) {
            if (this.notifications[i].thunderbirdId == id) {
                this.notifications[i].destroy();
                break;
            }
        }
    },
    
    /**
     * Switches to the workspace where Thunderbird is running and activates it.
     * If Thunderbird is not already running it is started.
     * @override
     */
    open: function() {
        // I think in upcoming versions of gnome-shell there will be an easier
        // way (something like this._tbApp.get_source_window()). 
        let windowTracker = Shell.WindowTracker.get_default();
        let runningApps = windowTracker.get_running_apps('');
        let thunderbird = null;
        for (i in runningApps) {
            if (runningApps[i].get_name() == this._tbApp.get_name()) {
                thunderbird = runningApps[i];
                break;
            }
        }
        if (thunderbird) {
            //TODO Ensure that the main window is assigned.
            let window = thunderbird.get_windows()[0];
            window.get_workspace().activate(true);
            Main.activateWindow(window, global.get_current_time());
        } else {
            Util.spawn(['thunderbird']);
        }  
    },

    /**
     * Creates the Thunderbird icon for the message tray.
     * @override
     * @return: Icon texture.
     */
    createNotificationIcon: function() {
        return this._tbApp.create_icon_texture(this.ICON_SIZE);
    }
};

///////////////////////////////////////////////////////////////////////////////
// Main ///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function main(extensionMeta) {
    
    Gettext.bindtextdomain('thunderbird-integration', 
            extensionMeta.path + '/locale');
    Gettext.textdomain('thunderbird-integration');
    
    let thunderbirdProxy = new ThunderbirdProxy();
    
}
