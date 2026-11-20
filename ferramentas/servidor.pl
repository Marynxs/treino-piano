#!/usr/bin/perl
# Servidor local simples para a pasta do Piano (usa só o Perl que já vem no macOS).
# Uso: perl ferramentas/servidor.pl [porta]   -> http://localhost:8000/treino-piano.html
# Também atende a rede de casa (para o iPhone abrir /celular.html). Só aceita endereços de rede local.
# /api/estado: o Mac grava (POST) a tela do treino e o iPhone lê (GET ?v=N -> 204 se não mudou).
# /api/cmd:    o iPhone grava (POST) um comando (Começar, Parar...) e o Mac lê (GET ?id=N -> 204 se não há novo).
use strict; use warnings;
use IO::Socket::INET;
use IO::Socket::IP;
use File::Basename qw(dirname);
use Cwd qw(abs_path);
use Time::HiRes ();

my $port = shift || 8000;
my $root = abs_path(dirname(abs_path($0)) . '/..');
my $tmp = ($ENV{TMPDIR} || '/tmp') . "/piano-servidor-$port"; mkdir $tmp;
my %mime = (html=>'text/html; charset=utf-8', htm=>'text/html; charset=utf-8', js=>'text/javascript; charset=utf-8',
  css=>'text/css; charset=utf-8', json=>'application/json', mp3=>'audio/mpeg', wav=>'audio/wav', ogg=>'audio/ogg',
  png=>'image/png', jpg=>'image/jpeg', jpeg=>'image/jpeg', svg=>'image/svg+xml', gif=>'image/gif', pdf=>'application/pdf',
  xml=>'application/xml', musicxml=>'application/xml', md=>'text/plain; charset=utf-8', txt=>'text/plain; charset=utf-8', ico=>'image/x-icon');

sub lan_ip { for my $if (qw(en0 en1 en2)) { my $ip = `ipconfig getifaddr $if 2>/dev/null`; chomp $ip; return $ip if $ip } return '' }
# Endereço de quem chama, sem o disfarce de IPv4 dentro de IPv6 (::ffff:192.168.0.5 -> 192.168.0.5; ::1 -> 127.0.0.1).
sub peer { my $a = lc(shift // ''); $a =~ s/^::ffff://; $a =~ s/%.*$//; return $a eq '::1' ? '127.0.0.1' : $a }
# Prefixos IPv6 (/64) do próprio Mac: um celular da mesma rede de casa tem o mesmo prefixo. Relidos a cada minuto.
my (@pre6, $pre6t);
# prefixos IPv6 da rede da casa: lidos do ifconfig no processo que atende o pedido (nunca no principal: um ifconfig
# preso travou o servidor inteiro em 18/11), guardados em $tmp/pre6 por 60 s
sub prefixos6 { my @s = stat("$tmp/pre6"); if (@s && time - $s[9] < 60) { return split /\n/, (slurp("$tmp/pre6") // '') }
  my @p; for (`ifconfig 2>/dev/null` =~ /inet6 ([0-9a-f:]+)/gi) { my $x = lc $_; next if $x =~ /^(fe80|::1$)/; my @h = split /:/, $x; push @p, join(':', @h[0..3]) if @h >= 4 }
  spit("$tmp/pre6", join("\n", @p)); @p }
sub local_ok { my $a = peer(shift);
  return 1 if $a =~ /^(127\.|10\.|192\.168\.|169\.254\.)/ || $a =~ /^172\.(1[6-9]|2\d|3[01])\./;
  return 1 if $a =~ /^(fe80|fc|fd)/;   # IPv6 da rede local (link-local e ULA)
  if ($a =~ /:/) { my @h = split /:/, $a; my $p = join(':', @h[0..3]); return 1 if grep { $_ eq $p } prefixos6() }
  return 0 }

# IPv6 e IPv4 na mesma porta: o nome .local do Mac (que não muda quando o roteador reinicia) responde sem atraso nos dois.
my $srv = IO::Socket::IP->new(LocalHost=>'::', LocalPort=>$port, Listen=>50, ReuseAddr=>1, Proto=>'tcp', V6Only=>0)
  || IO::Socket::INET->new(LocalAddr=>'0.0.0.0', LocalPort=>$port, Listen=>50, ReuseAddr=>1, Proto=>'tcp')
  or die "Não consegui abrir a porta $port (já tem um servidor rodando?): $!\n";
$SIG{CHLD} = 'IGNORE'; $| = 1;
my $ip = lan_ip(); my $host = `scutil --get LocalHostName 2>/dev/null`; chomp $host;
print "Servidor ligado: http://localhost:$port/treino-piano.html\nPasta: $root\n";
print "No iPhone (mesmo Wi-Fi): http://$ip:$port/celular.html" . ($host ? "  ou  http://$host.local:$port/celular.html" : '') . "\n" if $ip;
print "Para desligar, feche esta janela (ou Ctrl+C).\n";
{ mkdir "$root/registro"; my @t = localtime; if (open(my $fh, '>>', sprintf('%s/registro/%04d-%02d-%02d.log', $root, $t[5]+1900, $t[4]+1, $t[3]))) { printf $fh "%02d:%02d:%02d.000 [servidor] ligou na porta %s (pid %d)\n", $t[2], $t[1], $t[0], $port, $$; close $fh } }

sub reply { my ($c, $code, $type, $body, $extra) = @_; $body //= ''; $extra //= '';
  print $c "HTTP/1.0 $code\r\nContent-Type: $type\r\nContent-Length: " . length($body) . "\r\nCache-Control: no-store\r\n${extra}Connection: close\r\n\r\n$body" }
sub slurp { my $f = shift; open(my $fh, '<:raw', $f) or return undef; local $/; my $d = <$fh>; close $fh; return $d }
sub spit { my ($f, $d) = @_; open(my $fh, '>:raw', "$f.$$") or return; print $fh $d; close $fh; rename "$f.$$", $f }

# App do iPhone: uma vez por dia confere a assinatura; faltando 20 dias, reassina e reinstala sozinho (ferramentas/reinstalar-iphone.sh).
# Só no servidor da porta 8000. O resultado vai para o registro do dia.
if ($port == 8000 && -x '/usr/bin/xcrun' && !fork()) {
  close $srv; $0 = "perl ferramentas/servidor.pl $port (iPhone)";
  sleep 120;
  while (1) {
    my $r = `/bin/sh "$root/ferramentas/reinstalar-iphone.sh" 2>&1`; chomp $r; $r =~ s/\s+/ /g;
    my @t = localtime;
    if (open(my $fh, '>>', sprintf('%s/registro/%04d-%02d-%02d.log', $root, $t[5]+1900, $t[4]+1, $t[3]))) { printf $fh "%02d:%02d:%02d.000 [servidor] %s\n", $t[2], $t[1], $t[0], $r; close $fh }
    sleep 86400;
  }
}

while (my $c = $srv->accept) {
  my $pid = fork();
  if (!defined $pid || $pid) { close $c; next }
  close $srv; binmode $c;
  if (!local_ok($c->peerhost)) { close $c; exit 0 }
  my $req = <$c> // ''; my ($line, $len) = ('', 0);
  while (defined($line = <$c>) && $line ne "\r\n" && $line ne "\n") { $len = $1 if $line =~ /^Content-Length:\s*(\d+)/i }
  my ($meth, $path) = $req =~ m{^(GET|HEAD|POST) (\S+)};
  if (!$meth) { reply($c, '405 Method Not Allowed', 'text/plain', ''); exit 0 }
  my $q = $path =~ s/\?(.*)// ? $1 : ''; $path =~ s/#.*//; $path =~ s/%([0-9A-Fa-f]{2})/chr(hex $1)/ge;
  my %q = map { my ($k, $v) = split /=/, $_, 2; ($k => $v // '') } split /&/, $q;

  # Com &wait=1 a resposta espera (até 20 s) por novidade: chega na hora, sem depender de relógios do navegador.
  # Só um Mac (aba do app) comanda o iPhone: o "dono". Uma aba vira dona ao abrir, ao ganhar foco ou ao receber nota do piano (claim=1).
  if ($path eq '/api/estado') {
    if ($meth eq 'POST') {
      my $body = ''; read($c, $body, $len) if $len && $len < 5_000_000;
      my $ver = ($q{v} // '') =~ /^\d+$/ ? $q{v} : time; my $src = ($q{src} // '') =~ /^(\w+)$/ ? $1 : '';
      spit("$tmp/owner", $src) if $q{claim} && $src;
      if ($src ne (slurp("$tmp/owner") // '')) { reply($c, '409 Conflict', 'application/json', '{"ok":false,"dono":false}'); close $c; exit 0 }
      spit("$tmp/estado.json", $body); spit("$tmp/estado.v", $ver);
      reply($c, '200 OK', 'application/json', '{"ok":true}');
    } else {
      my $end = time + 20; my $cur;
      while (1) { $cur = slurp("$tmp/estado.v") // ''; last if !$q{wait} || ($cur ne '' && ($q{v} // '') ne $cur) || time >= $end; select(undef, undef, undef, 0.03) }
      if ($cur eq '' || ($q{v} // '') eq $cur) { reply($c, '204 No Content', 'text/plain', '') }
      else { reply($c, '200 OK', 'application/json', slurp("$tmp/estado.json") // '{}', "X-Versao: $cur\r\n") }
    }
    close $c; exit 0;
  }
  # Guia, metrônomo e gravação para o piano ligado no iPhone: o Mac grava aqui e o canal do celular (stream) entrega na hora.
  if ($path eq '/api/midiout' && $meth eq 'POST') {
    if (peer($c->peerhost) !~ /^127\./) { reply($c, '403 Forbidden', 'text/plain', 'só no Mac'); close $c; exit 0 }
    my $body = ''; read($c, $body, $len) if $len && $len < 200_000; $body =~ s/[\r\n]+/ /g;
    if ($body =~ /^\[/ && open(my $fh, '+>>', "$tmp/midiout.log")) { flock($fh, 2); seek($fh, 0, 0); my @l = <$fh>; my $n = @l && $l[-1] =~ /^(\d+)/ ? $1 + 1 : 1;
      push @l, "$n\t$body\n"; splice(@l, 0, @l - 100) if @l > 100; seek($fh, 0, 0); truncate($fh, 0); print $fh @l; close $fh; spit("$tmp/midiout.v", $n) }
    reply($c, '200 OK', 'application/json', '{"ok":true}'); close $c; exit 0;
  }
  # Canal contínuo para o iPhone (EventSource): a tela nova sai em até 10 ms depois de o Mac gravar.
  # Um "ping" a cada 100 ms mantém o Wi-Fi do iPhone acordado (sem ele, o iPhone cochila e a tela chega atrasada).
  if ($path eq '/api/stream') {
    print $c "HTTP/1.0 200 OK\r\nContent-Type: text/event-stream\r\nCache-Control: no-store\r\nConnection: close\r\n\r\nretry: 500\n\n";
    my ($sent, $n) = ('', 0); my $mo = slurp("$tmp/midiout.v") // 0;
    my $ev = $q{espelho} ? 'espelho' : 'estado';   # ?espelho=1: a tela do iPhone quando ele corrige (o Mac só mostra e comanda)
    while (1) {
      my $mv = slurp("$tmp/midiout.v") // 0;
      $mo = 0 if $mv < $mo;
      if (!$q{espelho} && $mv ne $mo) { for (split /\n/, (slurp("$tmp/midiout.log") // '')) { if (/^(\d+)\t(.*)$/ && $1 > $mo) { print $c "event: midi\ndata: $2\n\n" or last } } $mo = $mv }
      my $cur = slurp("$tmp/$ev.v") // '';
      if ($cur ne '' && $cur ne $sent) { my $d = slurp("$tmp/$ev.json") // ''; $d =~ s/[\r\n]+/ /g; print $c "data: $d\n\n" or last; $sent = $cur }
      elsif (++$n % 10 == 0) { print $c "event: ping\ndata: 1\n\n" or last }
      select(undef, undef, undef, 0.01);
    }
    close $c; exit 0;
  }
  # Espelho: o iPhone corrigindo manda a tela dele (POST); a aba do Mac pergunta a idade (?info=1) para mostrar o espelho.
  if ($path eq '/api/espelho') {
    if ($meth eq 'POST') { my $body = ''; read($c, $body, $len) if $len && $len < 5_000_000; spit("$tmp/espelho.json", $body); spit("$tmp/espelho.v", int(Time::HiRes::time() * 1000)); reply($c, '200 OK', 'application/json', '{"ok":true}'); close $c; exit 0 }
    my @s = stat("$tmp/espelho.v"); my $idade = @s ? time - $s[9] : 99999;
    reply($c, '200 OK', 'application/json', qq({"idade":$idade})); close $c; exit 0;
  }
  # Fila de comandos do iPhone: cada linha "número<TAB>json". GET ?id=N devolve os comandos depois de N.
  if ($path eq '/api/cmd') {
    my $f = $q{espelho} ? "$tmp/cmd-espelho.log" : "$tmp/cmd.log";   # ?espelho=1: comandos do Mac para o iPhone (o iPhone busca)
    if ($meth eq 'POST') {
      my $body = ''; read($c, $body, $len) if $len && $len < 100_000; $body =~ s/[\r\n]+/ /g;
      if (open(my $fh, '+>>', $f)) { flock($fh, 2); seek($fh, 0, 0); my @l = <$fh>; my $n = @l && $l[-1] =~ /^(\d+)/ ? $1 + 1 : 1;
        push @l, "$n\t$body\n"; splice(@l, 0, @l - 50) if @l > 50; seek($fh, 0, 0); truncate($fh, 0); print $fh @l; close $fh }
      reply($c, '200 OK', 'application/json', '{"ok":true}');
    } else {
      my $since = ($q{id} // '') =~ /^\d+$/ ? $q{id} : undef; my $end = time + 20; my (@new, $last);
      while (1) {
        my @l = split /\n/, (slurp($f) // ''); $last = @l && $l[-1] =~ /^(\d+)/ ? $1 : 0;
        my $dono = $q{espelho} || ($q{src} // '') eq (slurp("$tmp/owner") // '');
        @new = defined $since && $dono ? map { /^(\d+)\t(.*)$/ && $1 > $since ? $2 : () } @l : ();
        last if !defined $since || @new || !$q{wait} || time >= $end || $last < $since; select(undef, undef, undef, 0.01) }
      reply($c, '200 OK', 'application/json', '{"last":' . $last . ',"cmds":[' . join(',', @new) . ']}');
    }
    close $c; exit 0;
  }
  # PDF (ou imagem) de partitura -> MusicXML com o Audiveris (leitor de partituras gratuito, instalado em /Applications).
  # Só a partir do próprio Mac. Corpo = o arquivo; ?nome=arquivo.pdf. Resposta = o MusicXML (texto) ou o erro com o fim do log.
  if ($path eq '/api/omr' && $meth eq 'POST' && peer($c->peerhost) =~ /^127\./) {
    my $aud = '/Applications/Audiveris.app/Contents/MacOS/Audiveris';
    if (!-x $aud) { reply($c, '500 Internal Server Error', 'text/plain; charset=utf-8', 'O Audiveris não está instalado em Aplicativos.'); close $c; exit 0 }
    my ($ext) = ($q{nome} // '') =~ /\.(pdf|png|jpe?g|tiff?)$/i; $ext = lc($ext // 'pdf');
    my $dir = "$tmp/omr-" . time . "-$$"; mkdir $dir; mkdir "$dir/out";
    my ($body, $got, $buf) = ('', 0, ''); while ($got < $len) { my $want = $len - $got; $want = 1 << 20 if $want > (1 << 20); my $r = read($c, $buf, $want); last unless $r; $body .= $buf; $got += $r }
    spit("$dir/partitura.$ext", $body);
    # páginas escolhidas: ?ini=3&fim=4 (só PDF). Separa essas páginas antes de ler, para não converter o arquivo inteiro
    my $ini = ($q{ini} // '') =~ /^\d+$/ ? 0 + $q{ini} : 0; my $fim = ($q{fim} // '') =~ /^\d+$/ ? 0 + $q{fim} : 0; $fim ||= $ini;
    if ($ini && $ext eq 'pdf') {
      my $sai = qx{osascript -l JavaScript ferramentas/pdf-paginas.js '$dir/partitura.pdf' '$dir/paginas.pdf' $ini $fim 2>&1}; chomp $sai;
      if ($sai ne 'ok') { $sai =~ s/^erro: //; reply($c, '500 Internal Server Error', 'text/plain; charset=utf-8', "Não deu para separar as páginas: $sai"); close $c; exit 0 }
      rename("$dir/paginas.pdf", "$dir/partitura.pdf");
    }
    system("'$aud' -batch -export -output '$dir/out' '$dir/partitura.$ext' > '$dir/log.txt' 2>&1");
    # cada exercício separado da página vira uma "parte" (mvt1, mvt2…): em ordem de número, não de texto
    my $num = sub { $_[0] =~ /mvt(\d+)/ ? $1 : 0 };
    my @mxl = sort { $num->($a) <=> $num->($b) } glob("$dir/out/*.mxl"); my @xml = grep { !/\.omr$/ } sort glob("$dir/out/*.xml");
    my $abre = sub {   # .mxl = MusicXML compactado (zip): o arquivo principal está indicado em META-INF/container.xml
      my ($f) = @_; my $cont = `unzip -p '$f' META-INF/container.xml 2>/dev/null`; my ($root) = $cont =~ /full-path="([^"]+)"/;
      my $r = $root ? `unzip -p '$f' '$root' 2>/dev/null` : '';
      if (!$r) { my @l = grep { /\.(xml|musicxml)$/ && !/container/ } split /\n/, `unzip -Z1 '$f' 2>/dev/null`; $r = `unzip -p '$f' '$l[0]' 2>/dev/null` if @l }
      $r };
    my $res = '';
    if (@mxl) { $res = $q{todas} ? join("\n<!--PARTE-->\n", map { $abre->($_) } @mxl) : $abre->($mxl[0]) }
    elsif (@xml) { $res = slurp($xml[0]) // '' }
    if ($res =~ /<score-partwise|<score-timewise/) {
      my $extra = @mxl > 1 ? "X-Partes: " . scalar(@mxl) . "\r\n" : '';
      reply($c, '200 OK', 'application/xml; charset=utf-8', $res, $extra);
    } else {
      my $log = slurp("$dir/log.txt") // ''; my @l = grep { /WARN|ERROR|exception/i } split /\n/, $log; my $tail = join("\n", grep { defined } @l[-8 .. -1]); $tail =~ s/^\n+//;
      reply($c, '500 Internal Server Error', 'text/plain; charset=utf-8', "O Audiveris não conseguiu ler a partitura.\n$tail");
    }
    close $c; exit 0;
  }
  # Abre o AirDrop do Mac com o endereço do iPhone (só a partir do próprio Mac).
  if ($path eq '/api/airdrop' && peer($c->peerhost) =~ /^127\./) {
    # o nome .local (não muda quando o roteador reinicia); o servidor atende IPv6 e IPv4, então não atrasa mais
    my $url = 'http://' . ($host ? "$host.local" : lan_ip()) . ":$port/celular.html";
    if (!fork()) { close $c; exec('osascript', '-l', 'JavaScript', "$root/ferramentas/airdrop.js", $url); exit 0 }
    reply($c, '200 OK', 'application/json', qq({"ok":true,"url":"$url"})); close $c; exit 0;
  }
  # Relógio do Mac (para o iPhone medir o atraso) e registro dos atrasos que o iPhone mediu.
  if ($path eq '/api/time') { reply($c, '200 OK', 'application/json', '{"t":' . int(Time::HiRes::time() * 1000) . '}'); close $c; exit 0 }
  if ($path eq '/api/log' && $meth eq 'POST') {
    my $body = ''; read($c, $body, $len) if $len && $len < 100_000; $body =~ s/[\r\n]+/ /g;
    if (open(my $fh, '>>', "$tmp/atrasos.log")) { print $fh scalar(localtime) . "\t$body\n"; close $fh }
    reply($c, '200 OK', 'application/json', '{"ok":true}'); close $c; exit 0;
  }
  # Backup do progresso (só do próprio Mac): grava em backups/ na pasta do app e uma cópia no iCloud Drive
  # (pasta "Treino de Piano"), lista e devolve um backup. Ficam no máximo 60 arquivos em cada lugar.
  if ($path =~ m{^/api/backups?$} && peer($c->peerhost) !~ /^127\./) { reply($c, '403 Forbidden', 'text/plain', 'só no Mac'); close $c; exit 0 }
  if ($path eq '/api/backup' && $meth eq 'POST') {
    my $body = ''; read($c, $body, $len) if $len && $len < 60_000_000;
    if ($body !~ /^\s*\{/) { reply($c, '400 Bad Request', 'text/plain', 'backup vazio'); close $c; exit 0 }
    my @t = localtime; my $tipo = ($q{tipo} // '') eq 'auto' ? '-auto' : '';
    my $nome = sprintf('progresso-%04d-%02d-%02d-%02d%02d%02d%s.json', $t[5]+1900, $t[4]+1, $t[3], $t[2], $t[1], $t[0], $tipo);
    my $nuvem = '';
    for my $dir ("$root/backups", (-d "$ENV{HOME}/Library/Mobile Documents/com~apple~CloudDocs" ? "$ENV{HOME}/Library/Mobile Documents/com~apple~CloudDocs/Treino de Piano" : ())) {
      mkdir $dir; my $ok = open(my $fh, '>', "$dir/$nome"); if ($ok) { binmode $fh; print $fh $body; close $fh; $nuvem = 1 if $dir =~ /CloudDocs/ }
      elsif ($dir eq "$root/backups") { reply($c, '500 Internal Server Error', 'text/plain', "não consegui gravar: $!"); close $c; exit 0 }
      my @f = sort { $b cmp $a } grep { /^progresso-.*\.json$/ } do { my $d; opendir($d, $dir) ? readdir($d) : () };
      unlink map { "$dir/$_" } @f[60..$#f] if @f > 60;
    }
    reply($c, '200 OK', 'application/json', qq({"ok":true,"nome":"$nome","icloud":) . ($nuvem ? 'true' : 'false') . '}'); close $c; exit 0;
  }
  if ($path eq '/api/backups') {
    my @f = sort { $b cmp $a } grep { /^progresso-.*\.json$/ } do { my $d; opendir($d, "$root/backups") ? readdir($d) : () };
    reply($c, '200 OK', 'application/json', '[' . join(',', map { my $s = -s "$root/backups/$_"; qq({"nome":"$_","tam":$s}) } @f) . ']'); close $c; exit 0;
  }
  if ($path eq '/api/backup') {
    my $nome = $q{nome} // ''; $nome =~ s/%([0-9A-Fa-f]{2})/chr(hex $1)/ge;
    if ($nome !~ /^progresso-[\d-]+(-auto)?\.json$/ || !-f "$root/backups/$nome") { reply($c, '404 Not Found', 'text/plain', 'backup não encontrado'); close $c; exit 0 }
    open(my $fh, '<', "$root/backups/$nome"); binmode $fh; my $b = do { local $/; <$fh> }; close $fh;
    reply($c, '200 OK', 'application/json', $b); close $c; exit 0;
  }
  # Replays: cada tentativa guardada em replays/R-<id>.json (fora do git), com cópia no iCloud Drive ("Treino de Piano/replays").
  # Linha 1 do arquivo = resumo (nome, nota, data...), linha 2 = as teclas tocadas e o resultado. Apagar = lixeira por 30 dias.
  # GET: lista dos resumos | ?id=N: tudo | ?id=N&audio=1: o áudio feito pelo Mac (para compartilhar).
  # POST: novo replay = resumo (JSON) + quebra de linha + teclas e resultado (JSON) | ?id=N&acao=meta (resumo novo) | ?id=N&acao=apagar | ?id=N&acao=audio (WAV).
  # Estatística de cada tentativa (nota, certas, erradas, BPM, mão), guardada sempre, sem as teclas nem o som: a evolução de cada música.
  # replays/tentativas.jsonl, uma tentativa por linha, com cópia no iCloud. GET: lista | POST: uma tentativa (JSON numa linha).
  if ($path eq '/api/tentativas') {
    my $dir = "$root/replays"; mkdir $dir; my $f = "$dir/tentativas.jsonl";
    my $nuvem = !$ENV{PIANO_SEM_NUVEM} && -d "$ENV{HOME}/Library/Mobile Documents/com~apple~CloudDocs" ? "$ENV{HOME}/Library/Mobile Documents/com~apple~CloudDocs/Treino de Piano/replays" : '';
    if ($meth eq 'POST') {
      my $body = ''; read($c, $body, $len) if $len && $len < 100_000;
      # ?acao=perfil&ex=ID&de=P&para=Q&ate=MS: as tentativas desta música feitas no perfil errado passam para o certo (botão "Passar treinos para outro perfil")
      if (($q{acao} // '') eq 'perfil') {
        my ($ex, $de, $pa, $ate) = map { $q{$_} // '' } qw(ex de para ate);
        if ($ex !~ /^[\w-]{1,80}$/ || $de !~ /^\w{1,40}$/ || $pa !~ /^\w{1,40}$/ || $ate !~ /^\d{1,15}$/ || $de eq $pa) { reply($c, '400 Bad Request', 'text/plain', 'pedido inválido'); close $c; exit 0 }
        my $n = 0; my @l = split /\n/, (-f $f ? (slurp($f) // '') : '');
        for (@l) {
          next unless /^\{/; my ($e) = /"ex":"([^"]*)"/; next unless defined $e && ($e eq $ex || index($e, "${ex}_") == 0 || index($e, "$ex|") == 0);
          my ($p) = /"perfil":"([^"]*)"/; $p //= 'p0'; next unless $p eq $de; my ($t) = /"t":(\d+)/; next unless defined $t && $t <= $ate;
          if (/"perfil":"[^"]*"/) { s/"perfil":"[^"]*"/"perfil":"$pa"/ } else { s/^\{/{"perfil":"$pa",/ } $n++;
        }
        if ($n) { spit($f, join("\n", @l) . "\n"); if ($nuvem) { mkdir "$ENV{HOME}/Library/Mobile Documents/com~apple~CloudDocs/Treino de Piano"; mkdir $nuvem; spit("$nuvem/tentativas.jsonl", join("\n", @l) . "\n") } }
        reply($c, '200 OK', 'application/json', "{\"n\":$n}"); close $c; exit 0;
      }
      $body =~ s/[\r\n]+/ /g;
      if ($body !~ /^\{.*\}\s*$/) { reply($c, '400 Bad Request', 'text/plain', 'tentativa inválida'); close $c; exit 0 }
      if (open(my $o, '>>', $f)) { binmode $o; print $o "$body\n"; close $o }
      if ($nuvem) { mkdir "$ENV{HOME}/Library/Mobile Documents/com~apple~CloudDocs/Treino de Piano"; mkdir $nuvem; if (open(my $o, '>', "$nuvem/tentativas.jsonl")) { binmode $o; print $o (slurp($f) // ''); close $o } }
      reply($c, '200 OK', 'application/json', '{"ok":true}'); close $c; exit 0;
    }
    my @l = grep { /^\{/ } split /\n/, (-f $f ? (slurp($f) // '') : '');
    reply($c, '200 OK', 'application/json', '[' . join(',', @l) . ']'); close $c; exit 0;
  }
  # Som do piano gravado pelo app do iPhone durante uma tentativa (cabo no iPhone); o Mac pôs a chave k no estado (somk).
  # POST ?k=K&p0=MS (m4a; p0 = início no relógio do Mac) | POST ?k=K&erro=texto | GET ?k=K&info=1 | GET ?k=K (o arquivo). Some em 1 dia.
  if ($path eq '/api/somreplay') {
    my $dir = "$root/replays/somrep"; mkdir "$root/replays"; mkdir $dir;
    my $k = ($q{k} // '') =~ /^(\w{1,24})$/ ? $1 : '';
    if (!$k) { reply($c, '400 Bad Request', 'text/plain', 'falta k'); close $c; exit 0 }
    if ($meth eq 'POST') {
      my $body = ''; read($c, $body, $len) if $len && $len < 200_000_000;
      if (defined $q{erro}) { (my $e = $q{erro}) =~ s/[^\w À-ú.,:()-]/ /g; spit("$dir/$k.json", qq({"erro":"$e"})) }
      else { my $p0 = ($q{p0} // '') =~ /^(\d{1,16})$/ ? $1 : 0; spit("$dir/$k.m4a", $body); spit("$dir/$k.json", qq({"p0":$p0,"tam":) . length($body) . '}') }
      reply($c, '200 OK', 'application/json', '{"ok":true}'); close $c; exit 0;
    }
    for my $x (do { my $h; opendir($h, $dir) ? grep { /\.(m4a|json)$/ } readdir($h) : () }) { unlink "$dir/$x" if -M "$dir/$x" > 1 }
    my $f = $q{info} ? "$dir/$k.json" : "$dir/$k.m4a";
    if (!-f $f) { reply($c, '404 Not Found', 'text/plain', 'ainda não'); close $c; exit 0 }
    reply($c, '200 OK', $q{info} ? 'application/json' : 'audio/mp4', slurp($f)); close $c; exit 0;
  }
  if ($path eq '/api/replays') {
    my $dir = "$root/replays"; mkdir $dir; mkdir "$dir/lixeira"; mkdir "$dir/audio"; mkdir "$dir/som"; mkdir "$dir/lixeira/som";
    my $nuvem = !$ENV{PIANO_SEM_NUVEM} && -d "$ENV{HOME}/Library/Mobile Documents/com~apple~CloudDocs" ? "$ENV{HOME}/Library/Mobile Documents/com~apple~CloudDocs/Treino de Piano/replays" : '';
    my $id = ($q{id} // '') =~ /^(\d{1,16})$/ ? $1 : '';
    my $f = $id ? "$dir/R-$id.json" : '';
    my $copia = sub { return unless $nuvem && $f && -f $f; mkdir "$ENV{HOME}/Library/Mobile Documents/com~apple~CloudDocs/Treino de Piano"; mkdir $nuvem;
      if (open(my $o, '>', "$nuvem/R-$id.json")) { binmode $o; print $o (slurp($f) // ''); close $o } };
    if ($meth eq 'POST') {
      my $body = ''; read($c, $body, $len) if $len && $len < 400_000_000;   # o áudio de um replay longo passa de 40 MB (saía vazio)
      my $acao = $q{acao} // '';
      if ($acao eq 'audio' && $id) { spit("$dir/audio/$id" . (($q{v} // '') =~ /^(\w{1,20})$/ ? "-$1" : '') . ".wav", $body); reply($c, '200 OK', 'application/json', '{"ok":true}'); close $c; exit 0 }
      if ($acao eq 'som' && $id) { spit("$dir/som/$id.som", $body); if ($nuvem) { mkdir $nuvem; mkdir "$nuvem/som"; spit("$nuvem/som/$id.som", $body) }
        reply($c, '200 OK', 'application/json', '{"ok":true}'); close $c; exit 0 }
      if ($acao eq 'recuperar' && $id && -f "$dir/lixeira/R-$id.json") { rename "$dir/lixeira/R-$id.json", $f; rename "$dir/lixeira/som/$id.som", "$dir/som/$id.som" if -f "$dir/lixeira/som/$id.som"; $copia->(); reply($c, '200 OK', 'application/json', '{"ok":true}'); close $c; exit 0 }
      if ($acao eq 'apagar' && $id && -f $f) { rename $f, "$dir/lixeira/R-$id.json"; rename "$dir/som/$id.som", "$dir/lixeira/som/$id.som" if -f "$dir/som/$id.som"; unlink "$nuvem/som/$id.som" if $nuvem; unlink glob("$dir/audio/$id*.wav"); unlink "$nuvem/R-$id.json" if $nuvem;
        reply($c, '200 OK', 'application/json', '{"ok":true}'); close $c; exit 0 }
      if ($acao eq 'meta' && $id && -f $f && $body =~ /^\{/) { $body =~ s/[\r\n]+/ /g; my @l = split /\n/, (slurp($f) // ''), 2; spit($f, "$body\n" . ($l[1] // '{}')); $copia->();
        reply($c, '200 OK', 'application/json', '{"ok":true}'); close $c; exit 0 }
      if (!$acao && $body =~ /^(\{[^\n]*\})\n(\{.*\})\s*$/s) {   # resumo numa linha, teclas e resultado na outra
        my ($m, $d) = ($1, $2); my ($novo) = $m =~ /"id":(\d{1,16})/; $novo ||= int(Time::HiRes::time() * 1000);
        $id = $novo; $f = "$dir/R-$id.json"; $m =~ s/[\r\n]+/ /g; $d =~ s/[\r\n]+/ /g; spit($f, "$m\n$d"); $copia->();
        reply($c, '200 OK', 'application/json', qq({"ok":true,"id":$id})); close $c; exit 0 }
      reply($c, '400 Bad Request', 'text/plain', 'pedido de replay inválido'); close $c; exit 0;
    }
    if ($id) {
      if ($q{audio}) { my $v = $q{audio} =~ /^(\w{1,20})$/ && $q{audio} ne '1' ? "-$1" : ''; if (-f "$dir/audio/$id$v.wav") { my $a = slurp("$dir/audio/$id$v.wav"); reply($c, '200 OK', 'audio/wav', $a) } else { reply($c, '404 Not Found', 'text/plain', 'ainda sem áudio') } close $c; exit 0 }
      if ($q{som}) { if (-f "$dir/som/$id.som") { reply($c, '200 OK', 'application/octet-stream', slurp("$dir/som/$id.som")) } else { reply($c, '404 Not Found', 'text/plain', 'replay sem som gravado') } close $c; exit 0 }
      if (!-f $f) { reply($c, '404 Not Found', 'text/plain', 'replay não encontrado'); close $c; exit 0 }
      my @l = split /\n/, (slurp($f) // ''), 2; reply($c, '200 OK', 'application/json', qq({"meta":$l[0],"dados":) . ($l[1] // '{}') . '}'); close $c; exit 0;
    }
    # lixeira: some depois de 30 dias
    for my $x (do { my $h; opendir($h, "$dir/lixeira") ? grep { /^R-\d+\.json$/ } readdir($h) : () }) { unlink "$dir/lixeira/$x" if -M "$dir/lixeira/$x" > 30 }
    for my $x (do { my $h; opendir($h, "$dir/audio") ? grep { /\.wav$/ } readdir($h) : () }) { unlink "$dir/audio/$x" if -M "$dir/audio/$x" > 1 }   # áudios feitos para compartilhar: 1 dia
my $ld = $q{lixeira} ? "$dir/lixeira" : $dir;
    my @m;
    for my $x (do { my $h; opendir($h, $ld) ? grep { /^R-\d+\.json$/ } readdir($h) : () }) {
      if (open(my $i, '<', "$ld/$x")) { my $l = <$i>; close $i; chomp $l if defined $l; push @m, $l if $l && $l =~ /^\{/ } }
    reply($c, '200 OK', 'application/json', '[' . join(',', @m) . ']'); close $c; exit 0;
  }
  # Som do piano para o vídeo do iPhone (o cabo está no Mac): o Mac grava o som do piano e guarda aqui; o iPhone baixa e junta ao vídeo.
  # POST ?k=K&acao=estado (JSON do Mac: pronto, nome do aparelho ou erro) | POST ?k=K&t0=MS (WAV, só do Mac) | GET ?k=K&estado=1 | GET ?k=K&info=1 | GET ?k=K (o WAV).
  if ($path eq '/api/somvideo') {
    my $dir = "$root/replays/video"; mkdir "$root/replays"; mkdir $dir;
    my $k = ($q{k} // '') =~ /^(\w{1,24})$/ ? $1 : '';
    if (!$k) { reply($c, '400 Bad Request', 'text/plain', 'falta k'); close $c; exit 0 }
    if ($meth eq 'POST') {
      if (peer($c->peerhost) !~ /^127\./) { reply($c, '403 Forbidden', 'text/plain', 'só no Mac'); close $c; exit 0 }
      my $body = ''; read($c, $body, $len) if $len && $len < 600_000_000;
      if (($q{acao} // '') eq 'estado') { spit("$dir/$k-estado.json", $body) }
      else { my $t0 = ($q{t0} // '') =~ /^(\d{1,16})$/ ? $1 : 0; spit("$dir/$k.wav", $body); spit("$dir/$k.json", qq({"t0":$t0,"tam":) . length($body) . '}') }
      reply($c, '200 OK', 'application/json', '{"ok":true}'); close $c; exit 0;
    }
    for my $x (do { my $h; opendir($h, $dir) ? grep { /\.(wav|json)$/ } readdir($h) : () }) { unlink "$dir/$x" if -M "$dir/$x" > 1 }   # 1 dia
    my $f = $q{estado} ? "$dir/$k-estado.json" : $q{info} ? "$dir/$k.json" : "$dir/$k.wav";
    if (!-f $f) { reply($c, '404 Not Found', 'text/plain', 'ainda não'); close $c; exit 0 }
    reply($c, '200 OK', $f =~ /wav$/ ? 'audio/wav' : 'application/json', slurp($f)); close $c; exit 0;
  }
  # Registro do que acontece (Mac, celular e app do iPhone), um arquivo por dia em registro/ (fora do git).
  # POST ?de=mac|cel|app|cerebro: cada linha do corpo vira uma linha do arquivo (com a hora do Mac). GET ?n=200: as últimas linhas.
  if ($path eq '/api/registro') {
    my $dir = "$root/registro"; mkdir $dir;
    my @t = localtime; my $f = sprintf('%s/%04d-%02d-%02d.log', $dir, $t[5]+1900, $t[4]+1, $t[3]);
    if ($meth eq 'POST') {
      my $body = ''; read($c, $body, $len) if $len && $len < 2_000_000;
      my $de = ($q{de} // '') =~ /^(\w{1,12})$/ ? $1 : '?'; my $ip = peer($c->peerhost);
      my ($s, $us) = Time::HiRes::gettimeofday(); my @h = localtime($s); my $hora = sprintf('%02d:%02d:%02d.%03d', $h[2], $h[1], $h[0], $us / 1000);
      if (open(my $fh, '>>', $f)) { flock($fh, 2); for my $l (split /\r?\n/, $body) { next if $l !~ /\S/; $l = substr($l, 0, 2000); print $fh "$hora [$de $ip] $l\n" } close $fh }
      reply($c, '200 OK', 'application/json', '{"ok":true}'); close $c; exit 0;
    }
    my $n = ($q{n} // '') =~ /^(\d{1,5})$/ ? $1 : 200; my @l = split /\n/, (slurp($f) // ''); @l = @l[-$n .. -1] if @l > $n;
    reply($c, '200 OK', 'text/plain; charset=utf-8', join("\n", @l) . "\n"); close $c; exit 0;
  }
  # iPhone sozinho: troca de dados entre o Mac e o app do iPhone (cópias em backups/sync/, fora do git).
  # POST ?de=mac (só do Mac): a cópia atual do Mac. GET ?de=mac[&v=N]: a mais nova (ou a de número N), {"v":N,"dados":...}.
  # POST ?de=iphone&usou=N: o resultado que o iPhone juntou com a cópia N do Mac. GET ?de=iphone&depois=T: o primeiro depois de T, ou 204.
  if ($path eq '/api/dados') {
    my $dir = "$root/backups/sync"; mkdir "$root/backups"; mkdir $dir;
    my $de = ($q{de} // '') =~ /^(mac|iphone)$/ ? $1 : '';
    if (!$de) { reply($c, '400 Bad Request', 'text/plain', 'de=mac ou de=iphone'); close $c; exit 0 }
    my @f = sort { ($b =~ /(\d+)/)[0] <=> ($a =~ /(\d+)/)[0] } grep { /^$de-\d+\.json$/ } do { my $d; opendir($d, $dir) ? readdir($d) : () };
    if ($meth eq 'POST') {
      if ($de eq 'mac' && peer($c->peerhost) !~ /^127\./) { reply($c, '403 Forbidden', 'text/plain', 'só no Mac'); close $c; exit 0 }
      my $body = ''; read($c, $body, $len) if $len && $len < 20_000_000;
      if ($body !~ /^\{/) { reply($c, '400 Bad Request', 'text/plain', 'esperava JSON'); close $c; exit 0 }
      my $v = int(Time::HiRes::time() * 1000); my $usou = ($q{usou} // '') =~ /^(\d+)$/ ? $1 : 0;
      spit("$dir/$de-$v.json", $de eq 'mac' ? qq({"v":$v,"dados":$body}) : qq({"v":$v,"usou":"$usou","dados":$body}));
      unlink map { "$dir/$_" } @f[($de eq 'mac' ? 29 : 19) .. $#f] if @f > ($de eq 'mac' ? 29 : 19);
      reply($c, '200 OK', 'application/json', qq({"ok":true,"v":$v})); close $c; exit 0;
    }
    if ($de eq 'mac') {
      my $want = ($q{v} // '') =~ /^(\d+)$/ ? $1 : '';
      my ($n) = $want ? grep { $_ eq "mac-$want.json" } @f : ($f[0]);
      if (!$n) { reply($c, '404 Not Found', 'text/plain', 'sem cópia'); close $c; exit 0 }
      reply($c, '200 OK', 'application/json', slurp("$dir/$n") // '{}'); close $c; exit 0;
    }
    if (($q{v} // '') =~ /^(\d+)$/) { my $w = $1; my ($n) = grep { $_ eq "iphone-$w.json" } @f; if (!$n) { reply($c, '404 Not Found', 'text/plain', 'sem essa entrega'); close $c; exit 0 } reply($c, '200 OK', 'application/json', slurp("$dir/$n") // '{}'); close $c; exit 0 }   # uma entrega certa (o Mac usa a anterior como base)
    my $depois = ($q{depois} // '') =~ /^(\d+)$/ ? $1 : 0;
    my ($n) = reverse grep { (/(\d+)/)[0] > $depois } @f;
    if (!$n) { reply($c, '204 No Content', 'text/plain', ''); close $c; exit 0 }
    reply($c, '200 OK', 'application/json', slurp("$dir/$n") // '{}'); close $c; exit 0;
  }
  # Lista dos arquivos do app (tamanho e data), para o iPhone guardar uma cópia e treinar sem o Mac.
  if ($path eq '/api/arquivos') {
    my @l = grep { -f "$root/$_" } (qw(treino-piano.html treino-piano.css treino-piano.js celular.html queda.js qr.js nosleep.js conteudo-pessoal.js livro-progresso.json app-mac.json app-cel.json),
      map { my $d = $_; my $h; opendir($h, "$root/$d") ? map { "$d/$_" } grep { !/^\./ && -f "$root/$d/$_" } readdir($h) : () } qw(icones sons fontes));
    my $j = join(',', map { my @s = stat("$root/$_"); qq({"p":"$_","t":$s[9],"n":$s[7]}) } @l);
    reply($c, '200 OK', 'application/json', "[$j]"); close $c; exit 0;
  }
  # idade: segundos desde a última tela do Mac (a aba do app manda pelo menos a cada 10 s; sem ela, o iPhone treina sozinho)
  if ($path eq '/api/info') { my $h = $host ? "$host.local" : ''; my @s = stat("$tmp/estado.v"); my $idade = @s ? time - $s[9] : 99999; reply($c, '200 OK', 'application/json', qq({"ip":"@{[lan_ip()]}","host":"$h","port":$port,"idade":$idade})); close $c; exit 0 }

  $path = '/treino-piano.html' if $path eq '/';
  my $file = "$root$path";
  if ($meth eq 'POST' || $path =~ m{(^|/)\.\.(/|$)} || !-f $file) { reply($c, '404 Not Found', 'text/plain; charset=utf-8', "Arquivo não encontrado: $path"); exit 0 }
  my ($ext) = $file =~ /\.([^.\/]+)$/; my $type = $mime{lc($ext // '')} // 'application/octet-stream';
  my $size = -s $file;
  print $c "HTTP/1.0 200 OK\r\nContent-Type: $type\r\nContent-Length: $size\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n";
  if ($meth eq 'GET' && open(my $fh, '<:raw', $file)) { my $buf; print $c $buf while read($fh, $buf, 65536); close $fh }
  close $c; exit 0;
}
