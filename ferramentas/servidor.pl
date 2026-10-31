#!/usr/bin/perl
# Servidor local simples para a pasta do Piano (usa só o Perl que já vem no macOS).
# Uso: perl ferramentas/servidor.pl [porta]   -> http://localhost:8000/treino-piano.html
# Também atende a rede de casa (para o iPhone abrir /celular.html). Só aceita endereços de rede local.
# /api/estado: o Mac grava (POST) a tela do treino e o iPhone lê (GET ?v=N -> 204 se não mudou).
# /api/cmd:    o iPhone grava (POST) um comando (Começar, Parar...) e o Mac lê (GET ?id=N -> 204 se não há novo).
use strict; use warnings;
use IO::Socket::INET;
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
sub local_ok { my $a = shift // ''; return $a =~ /^(127\.|10\.|192\.168\.|169\.254\.)/ || $a =~ /^172\.(1[6-9]|2\d|3[01])\./ }

my $srv = IO::Socket::INET->new(LocalAddr=>'0.0.0.0', LocalPort=>$port, Listen=>50, ReuseAddr=>1, Proto=>'tcp')
  or die "Não consegui abrir a porta $port (já tem um servidor rodando?): $!\n";
$SIG{CHLD} = 'IGNORE'; $| = 1;
my $ip = lan_ip(); my $host = `scutil --get LocalHostName 2>/dev/null`; chomp $host;
print "Servidor ligado: http://localhost:$port/treino-piano.html\nPasta: $root\n";
print "No iPhone (mesmo Wi-Fi): http://$ip:$port/celular.html" . ($host ? "  ou  http://$host.local:$port/celular.html" : '') . "\n" if $ip;
print "Para desligar, feche esta janela (ou Ctrl+C).\n";

sub reply { my ($c, $code, $type, $body, $extra) = @_; $body //= ''; $extra //= '';
  print $c "HTTP/1.0 $code\r\nContent-Type: $type\r\nContent-Length: " . length($body) . "\r\nCache-Control: no-store\r\n${extra}Connection: close\r\n\r\n$body" }
sub slurp { my $f = shift; open(my $fh, '<:raw', $f) or return undef; local $/; my $d = <$fh>; close $fh; return $d }
sub spit { my ($f, $d) = @_; open(my $fh, '>:raw', "$f.$$") or return; print $fh $d; close $fh; rename "$f.$$", $f }

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
  # Canal contínuo para o iPhone (EventSource): a tela nova sai em até 10 ms depois de o Mac gravar.
  # Um "ping" a cada 100 ms mantém o Wi-Fi do iPhone acordado (sem ele, o iPhone cochila e a tela chega atrasada).
  if ($path eq '/api/stream') {
    print $c "HTTP/1.0 200 OK\r\nContent-Type: text/event-stream\r\nCache-Control: no-store\r\nConnection: close\r\n\r\nretry: 500\n\n";
    my ($sent, $n) = ('', 0);
    while (1) {
      my $cur = slurp("$tmp/estado.v") // '';
      if ($cur ne '' && $cur ne $sent) { my $d = slurp("$tmp/estado.json") // ''; $d =~ s/[\r\n]+/ /g; print $c "data: $d\n\n" or last; $sent = $cur }
      elsif (++$n % 10 == 0) { print $c "event: ping\ndata: 1\n\n" or last }
      select(undef, undef, undef, 0.01);
    }
    close $c; exit 0;
  }
  # Fila de comandos do iPhone: cada linha "número<TAB>json". GET ?id=N devolve os comandos depois de N.
  if ($path eq '/api/cmd') {
    my $f = "$tmp/cmd.log";
    if ($meth eq 'POST') {
      my $body = ''; read($c, $body, $len) if $len && $len < 100_000; $body =~ s/[\r\n]+/ /g;
      if (open(my $fh, '+>>', $f)) { flock($fh, 2); seek($fh, 0, 0); my @l = <$fh>; my $n = @l && $l[-1] =~ /^(\d+)/ ? $1 + 1 : 1;
        push @l, "$n\t$body\n"; splice(@l, 0, @l - 50) if @l > 50; seek($fh, 0, 0); truncate($fh, 0); print $fh @l; close $fh }
      reply($c, '200 OK', 'application/json', '{"ok":true}');
    } else {
      my $since = ($q{id} // '') =~ /^\d+$/ ? $q{id} : undef; my $end = time + 20; my (@new, $last);
      while (1) {
        my @l = split /\n/, (slurp($f) // ''); $last = @l && $l[-1] =~ /^(\d+)/ ? $1 : 0;
        my $dono = ($q{src} // '') eq (slurp("$tmp/owner") // '');
        @new = defined $since && $dono ? map { /^(\d+)\t(.*)$/ && $1 > $since ? $2 : () } @l : ();
        last if !defined $since || @new || !$q{wait} || time >= $end || $last < $since; select(undef, undef, undef, 0.01) }
      reply($c, '200 OK', 'application/json', '{"last":' . $last . ',"cmds":[' . join(',', @new) . ']}');
    }
    close $c; exit 0;
  }
  # PDF (ou imagem) de partitura -> MusicXML com o Audiveris (leitor de partituras gratuito, instalado em /Applications).
  # Só a partir do próprio Mac. Corpo = o arquivo; ?nome=arquivo.pdf. Resposta = o MusicXML (texto) ou o erro com o fim do log.
  if ($path eq '/api/omr' && $meth eq 'POST' && $c->peerhost =~ /^127\./) {
    my $aud = '/Applications/Audiveris.app/Contents/MacOS/Audiveris';
    if (!-x $aud) { reply($c, '500 Internal Server Error', 'text/plain; charset=utf-8', 'O Audiveris não está instalado em Aplicativos.'); close $c; exit 0 }
    my ($ext) = ($q{nome} // '') =~ /\.(pdf|png|jpe?g|tiff?)$/i; $ext = lc($ext // 'pdf');
    my $dir = "$tmp/omr-" . time . "-$$"; mkdir $dir; mkdir "$dir/out";
    my ($body, $got, $buf) = ('', 0, ''); while ($got < $len) { my $want = $len - $got; $want = 1 << 20 if $want > (1 << 20); my $r = read($c, $buf, $want); last unless $r; $body .= $buf; $got += $r }
    spit("$dir/partitura.$ext", $body);
    system("'$aud' -batch -export -output '$dir/out' '$dir/partitura.$ext' > '$dir/log.txt' 2>&1");
    my @mxl = sort glob("$dir/out/*.mxl"); my @xml = grep { !/\.omr$/ } sort glob("$dir/out/*.xml");
    my $res = '';
    if (@mxl) {   # .mxl = MusicXML compactado (zip): o arquivo principal está indicado em META-INF/container.xml
      my $cont = `unzip -p '$mxl[0]' META-INF/container.xml 2>/dev/null`; my ($root) = $cont =~ /full-path="([^"]+)"/;
      $res = $root ? `unzip -p '$mxl[0]' '$root' 2>/dev/null` : '';
      if (!$res) { my @l = grep { /\.(xml|musicxml)$/ && !/container/ } split /\n/, `unzip -Z1 '$mxl[0]' 2>/dev/null`; $res = `unzip -p '$mxl[0]' '$l[0]' 2>/dev/null` if @l }
    } elsif (@xml) { $res = slurp($xml[0]) // '' }
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
  if ($path eq '/api/airdrop' && $c->peerhost =~ /^127\./) {
    # o número (IP) e não o nome .local: o nome .local faz o iPhone tentar IPv6 antes e atrasa
    my $url = 'http://' . (lan_ip() || "$host.local") . ":$port/celular.html";
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
  if ($path =~ m{^/api/backups?$} && $c->peerhost !~ /^127\./) { reply($c, '403 Forbidden', 'text/plain', 'só no Mac'); close $c; exit 0 }
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
  if ($path eq '/api/info') { my $h = $host ? "$host.local" : ''; reply($c, '200 OK', 'application/json', qq({"ip":"@{[lan_ip()]}","host":"$h","port":$port})); close $c; exit 0 }

  $path = '/treino-piano.html' if $path eq '/';
  my $file = "$root$path";
  if ($meth eq 'POST' || $path =~ m{(^|/)\.\.(/|$)} || !-f $file) { reply($c, '404 Not Found', 'text/plain; charset=utf-8', "Arquivo não encontrado: $path"); exit 0 }
  my ($ext) = $file =~ /\.([^.\/]+)$/; my $type = $mime{lc($ext // '')} // 'application/octet-stream';
  my $size = -s $file;
  print $c "HTTP/1.0 200 OK\r\nContent-Type: $type\r\nContent-Length: $size\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n";
  if ($meth eq 'GET' && open(my $fh, '<:raw', $file)) { my $buf; print $c $buf while read($fh, $buf, 65536); close $fh }
  close $c; exit 0;
}
