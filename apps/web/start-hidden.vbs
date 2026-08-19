Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\Admin\Documents\Default Project\apps\web"
WshShell.Run "cmd /c node node_modules\next\dist\bin\next dev -p 3000 > nul 2>&1", 0, False
