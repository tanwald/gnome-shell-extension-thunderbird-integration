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

    @dbus.service.signal(dbus_interface=_BUSNAME, signature='ss')
    def NewMessageSignal(self, author, subject):
        pass

if __name__ == '__main__':
    author = sys.argv[1]
    subject = sys.argv[2] if (len(sys.argv) > 2) else ''
    
    tb_dbus = ThunderbirdDBus()
    tb_dbus.NewMessageSignal(author, subject)
