#!/bin/sh

TBFOLDER=$HOME/.thunderbird
GSFOLDER=$HOME/.local/share/gnome-shell/extensions
TBEXT=gnome-shell-integration\@tanwald.net
GSEXT=thunderbird-integration\@tanwald.net

for FOLDER in $(cat $TBFOLDER/profiles.ini | grep Path=); do
	TBEXTFOLDER=$TBFOLDER/${FOLDER#Path=}/extensions
	echo "cp -rv $TBEXT $TBEXTFOLDER"
	echo "chmod 755 $TBEXTFOLDER/$TBEXT/chrome/content/gnome-shell-integration.py"
done

echo "cp -rv $GSEXT $GSFOLDER"

echo -e "\nDONE. You might need to (re)start Thunderbird with the -purgecaches flag.\n" 
