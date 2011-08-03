/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

const DBus = imports.dbus;
const Lang = imports.lang;
const Shell = imports.gi.Shell;

const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const Util = imports.misc.util;

const ThunderbirdIface = {
    name: 'org.mozilla.thunderbird.DBus',
    path: '/org/mozilla/thunderbird/DBus',
    methods: [],
    signals: [{ name: 'NewMailSignal',
                inSignature: 'ss' }]
};

///////////////////////////////////////////////////////////////////////////////
// ThunderbirdProxy ///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function ThunderbirdProxy() {
    this._init();
}

ThunderbirdProxy.prototype = {
    _init: function() {
        this._source = null;
        DBus.session.proxifyObject(this, 
                                   ThunderbirdIface.name, 
                                   ThunderbirdIface.path);
        this.connect('NewMailSignal',
                     Lang.bind(this, this._onNewMail));
    },

    _onNewMail: function(object, author, subject) {
        if (this._source == null) {
            this._source = new ThunderbirdNotificationSource();
            this._source.connect('destroy', 
                                 Lang.bind(this, 
                                           function() { 
                                               this._source = null; 
                                           }));
            Main.messageTray.add(this._source);
        }
        this._source.onNewMail(author, subject);
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

    _init: function() {
        MessageTray.Source.prototype._init.call(this, 'thunderbird');
        let appSystem = Shell.AppSystem.get_default();
        this._tbApp = appSystem.get_app('mozilla-thunderbird.desktop');
        this._setSummaryIcon(this.createNotificationIcon());
    },
    
    onNewMail: function(author, subject) {
        let title = (this.notifications.length + 1) + '. New Mail';
        let message = 'From: ' + author + '\nSubject: ' + subject;
        this.notify(new MessageTray.Notification(this, title, message));
    },
    
    open: function() {
        this.destroyNonResidentNotifications();
        this._launchThunderbird();  
    },

    createNotificationIcon: function() {
        return this._tbApp.create_icon_texture(this.ICON_SIZE);
    },
    
    _launchThunderbird: function() {
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
            let window = thunderbird.get_windows()[0];
            window.get_workspace().activate(true);
            Main.activateWindow(window, global.get_current_time());
        } else {
            Util.spawn(['thunderbird']);
        }
    }
};

///////////////////////////////////////////////////////////////////////////////
// Main ///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

function main() {
    let thunderbirdProxy = new ThunderbirdProxy();
}
