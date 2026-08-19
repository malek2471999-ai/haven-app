Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d ""C:\Users\Admin\Documents\Default Project\apps\web"" && node node_modules\next\dist\bin\next start -p 3000", 0, False
WScript.Sleep 8000
Set colProcesses = GetObject("winmgmts:\\.\root\cimv2").ExecQuery("SELECT * FROM Win32_Process WHERE Name = 'node.exe'")
If colProcesses.Count > 0 Then
    WScript.Echo "Server running"
Else
    WScript.Echo "Server NOT running"
End If
