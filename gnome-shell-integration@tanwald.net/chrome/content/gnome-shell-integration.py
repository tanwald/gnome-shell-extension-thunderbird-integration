#!/usr/bin/env python

import dbus
from dbus.mainloop.glib import DBusGMainLoop
import dbus.service
import sys

class ThunderbirdDBus(dbus.service.Object):
    _BUSNAME = 'org.mozilla.thunderbird.DBus'
    _OBJECT_PATH = '/org/mozilla/thunderbird/DBus'
    
    def __init__(self):
        bus = dbus.SessionBus(mainloop=DBusGMainLoop())
        busname = dbus.service.BusName(self._BUSNAME, bus=bus)
        super(ThunderbirdDBus, self).__init__(busname, self._OBJECT_PATH)

    @dbus.service.signal(dbus_interface=_BUSNAME, signature='sss')
    def NewMessageSignal(self, id, author, subject):
        pass
    
    @dbus.service.signal(dbus_interface=_BUSNAME, signature='ss')
    def ChangedMessageSignal(self, id, event):
        pass
    
if __name__ == '__main__':
    event = sys.argv[1]
    id = sys.argv[2]
    author = sys.argv[3] if (len(sys.argv) > 3) else ''
    subject = sys.argv[4] if (len(sys.argv) > 4) else ''
    
    tb_dbus = ThunderbirdDBus()
    if event == 'new':
        tb_dbus.NewMessageSignal(id, author, subject)
    elif event == 'read' or 'deleted':
        tb_dbus.ChangedMessageSignal(id, event)
