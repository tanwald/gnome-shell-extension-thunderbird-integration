#include <libintl.h>
#include <locale.h>
#include <stdio.h>
#include <stdlib.h>
int main(void)
{
  setlocale( LC_ALL, "" );
  bindtextdomain( "thunderbird-integration", "/usr/share/locale" );
  textdomain( "thunderbird-integration" );
  printf( gettext( "New Mail" ) );
  exit(0);
}
