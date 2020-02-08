Run "C:\Program Files\Git\git-cmd.exe"
Sleep 7000
Send cd c:/users/%A_Username%/documents/github/cs307
Send {enter}
Sleep 1000
Send git add --all
Send {enter}
Sleep 5000
Send git commit -m "Add files"
Send {enter}
Sleep 10000
Send git push	
Send {enter}
Sleep 20000
Send !{f4}