#!/bin/sh

TBFOLDER=$HOME/.thunderbird
GSFOLDER=$HOME/.local/share/gnome-shell/extensions
TBEXT=gnome-shell-integration\@tanwald.net
GSEXT=thunderbird-integration\@tanwald.net

for FOLDER in $(cat $TBFOLDER/profiles.ini | grep Path=); do
    TBEXTFOLDER=$TBFOLDER/${FOLDER#Path=}/extensions
    cp -rv $TBEXT $TBEXTFOLDER
    chmod 755 $TBEXTFOLDER/$TBEXT/chrome/content/gnome-shell-integration.py
done

cp -rv $GSEXT $GSFOLDER

echo -e "\nDONE. You might need to (re)start Thunderbird with the -purgecaches flag.\n" 
