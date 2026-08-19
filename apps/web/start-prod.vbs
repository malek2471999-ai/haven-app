Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d ""C:\Users\Admin\Documents\Default Project\apps\web"" && node node_modules\next\dist\bin\next start -p 3000", 0, False
