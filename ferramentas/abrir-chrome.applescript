-- Abre o app no Chrome sem duplicar: se já houver uma aba do treino, recarrega e mostra essa;
-- abas repetidas do treino são fechadas (só uma pode usar o piano e o iPhone).
on run argv
	set alvo to item 1 of argv
	set achou to false
	tell application "Google Chrome"
		activate
		repeat with w in windows
			set i to (count of tabs of w)
			repeat while i ≥ 1
				set t to tab i of w
				if URL of t contains "localhost:8000/treino-piano" then
					if achou then
						close t
					else
						set achou to true
						set URL of t to alvo
						set active tab index of w to i
						set index of w to 1
					end if
				end if
				set i to i - 1
			end repeat
		end repeat
		if not achou then
			if (count of windows) = 0 then make new window
			tell window 1 to make new tab with properties {URL:alvo}
		end if
	end tell
end run
