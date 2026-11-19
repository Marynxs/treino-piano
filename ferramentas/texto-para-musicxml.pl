# Gera MusicXML a partir de mia.txt (transcrição do PDF). Uso: perl gerar.pl mia.txt > saida.musicxml
use strict; use warnings;
my $DIV = 56;   # divisões por semínima (cabe semicolcheia e o tuplet 7:8)
my %DUR = ('w'=>224, 'h.'=>168, 'h'=>112, 'q.'=>84, 'q'=>56, 'e.'=>42, 'e'=>28, 's'=>14);
my %TYPE = ('w'=>'whole', 'h.'=>'half', 'h'=>'half', 'q.'=>'quarter', 'q'=>'quarter', 'e.'=>'eighth', 'e'=>'eighth', 's'=>'16th');
my %ALT = (''=>0, '#'=>1, 'x'=>2, 'b'=>-1, 'bb'=>-2);
my %ACC = (1=>'sharp', 2=>'double-sharp', -1=>'flat', -2=>'flat-flat', 0=>'natural');

my (@med, $cur);
while (my $l = <>) {
  chomp $l; next if $l =~ /^\s*(#|$)/;
  if ($l =~ /^M\s+(\S+)(.*)$/) { $cur = { num => $1, opts => $2, voz => [] }; push @med, $cur; next }
  if ($l =~ /^(\d)\.(\d):\s*(.*)$/) { push @{ $cur->{voz} }, { st => $1, v => $2, toks => [ split /\s+/, $3 ] }; next }
  die "linha estranha: $l\n";
}

sub nota_dur { my ($t) = @_; $t =~ s{^\[|\]$}{}g; my ($d, $tup) = $t =~ /:([whqes]\.?)(?:@(\d+):(\d+)\w)?$/ or die "sem duração: $t"; my $x = $DUR{$d};
  if ($tup) { my ($a, $n) = $t =~ /@(\d+):(\d+)/; $x = $x * $n / $a } return $x }

# comprimento de cada voz (para achar o tamanho do compasso e completar com pausas escondidas)
for my $m (@med) { for my $v (@{ $m->{voz} }) { my $s = 0; for my $t (@{ $v->{toks} }) { next unless $t =~ /:/; $s += nota_dur($t) } $v->{len} = $s }
  my $max = 0; $max = $_->{len} > $max ? $_->{len} : $max for @{ $m->{voz} }; $m->{len} = $max }

my $x = <<'CAB';
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work>
    <work-title>Mia &amp; Sebastian's Theme (La La Land)</work-title>
  </work>
  <identification>
    <creator type="composer">Justin Hurwitz</creator>
    <creator type="arranger">Transcr. Joachim Valente</creator>
    <encoding>
      <software>Treino de Piano (conferido nota a nota com o PDF pianounchained)</software>
    </encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
      <score-instrument id="P1-I1">
        <instrument-name>Piano</instrument-name>
      </score-instrument>
      <midi-instrument id="P1-I1">
        <midi-channel>1</midi-channel>
        <midi-program>1</midi-program>
      </midi-instrument>
    </score-part>
  </part-list>
  <part id="P1">
CAB

my $prevcad = 0; my $first = 1;
for my $i (0 .. $#med) {
  my $m = $med[$i]; my $o = $m->{opts};
  my $cad = $o =~ /\bcad\b/;
  my $impl = $m->{num} =~ /[a-z]$/ ? ' implicit="yes"' : '';
  $x .= qq(    <measure number="$m->{num}"$impl>\n);
  my $attr = '';
  $attr .= "      <divisions>$DIV</divisions>\n" if $first;
  $attr .= "      <key>\n        <fifths>$1</fifths>\n      </key>\n" if $o =~ /key=(-?\d+)/;
  if ($cad) {
    my ($n, $u) = ($m->{len} / 28, 8); if ($n != int $n) { $n = $m->{len} / 14; $u = 16 }
    $attr .= qq(      <time print-object="no">\n        <beats>$n</beats>\n        <beat-type>$u</beat-type>\n      </time>\n);
  } elsif ($o =~ m{time=(\d+)/(\d+)}) {
    my $po = $first ? '' : ' print-object="no"';
    $attr .= qq(      <time$po>\n        <beats>$1</beats>\n        <beat-type>$2</beat-type>\n      </time>\n);
  } elsif ($prevcad) {
    $attr .= qq(      <time print-object="no">\n        <beats>3</beats>\n        <beat-type>4</beat-type>\n      </time>\n);
  }
  if ($first) { $attr .= "      <staves>2</staves>\n      <clef number=\"1\">\n        <sign>G</sign>\n        <line>2</line>\n      </clef>\n      <clef number=\"2\">\n        <sign>F</sign>\n        <line>4</line>\n      </clef>\n" }
  $x .= "      <attributes>\n$attr      </attributes>\n" if $attr;
  if ($o =~ /tempo=(\d+)/) {
    $x .= qq(      <direction placement="above">\n        <direction-type>\n          <metronome>\n            <beat-unit>quarter</beat-unit>\n            <per-minute>$1</per-minute>\n          </metronome>\n        </direction-type>\n        <staff>1</staff>\n        <sound tempo="$1"/>\n      </direction>\n);
  }
  my $pos = 0;
  for my $vi (0 .. $#{ $m->{voz} }) {
    my $v = $m->{voz}[$vi];
    if ($pos > 0) { $x .= "      <backup>\n        <duration>$pos</duration>\n      </backup>\n" }
    $pos = 0; my $beam = 0; my @t = @{ $v->{toks} };
    my $voice = $v->{st} == 1 ? $v->{v} : $v->{v};
    for my $k (0 .. $#t) {
      my $tok = $t[$k];
      if ($tok eq '{8va') { $x .= qq(      <direction placement="above">\n        <direction-type>\n          <octave-shift type="down" size="8" number="1"/>\n        </direction-type>\n        <staff>$v->{st}</staff>\n      </direction>\n); next }
      if ($tok eq '8va}') { $x .= qq(      <direction>\n        <direction-type>\n          <octave-shift type="stop" size="8" number="1"/>\n        </direction-type>\n        <staff>$v->{st}</staff>\n      </direction>\n); next }
      if ($tok =~ /^%([GF])$/) { my ($s, $ln) = $1 eq 'G' ? ('G', 2) : ('F', 4); $x .= qq(      <attributes>\n        <clef number="$v->{st}">\n          <sign>$s</sign>\n          <line>$ln</line>\n        </clef>\n      </attributes>\n); next }
      my $bstart = $tok =~ s/^\[//; my $bend = $tok =~ s/\]$//;
      $beam = 1 if $bstart;
      my ($ps, $d) = split /:/, $tok, 2;
      my $dur = nota_dur($tok); my ($dc) = $d =~ /^([whqes]\.?)/; my $type = $TYPE{$dc}; my $dot = $dc =~ /\./;
      my ($ta, $tn) = $d =~ /@(\d+):(\d+)/;
      my $tupst = ''; if ($ta) { my $prev = $k > 0 && $t[$k-1] =~ /@/; my $next = $k < $#t && $t[$k+1] =~ /@/; $tupst = !$prev ? 'start' : !$next ? 'stop' : '' }
      my $tm = $ta ? "        <time-modification>\n          <actual-notes>$ta</actual-notes>\n          <normal-notes>$tn</normal-notes>\n          <normal-type>half</normal-type>\n        </time-modification>\n" : '';
      my $beamx = '';
      if ($beam && $dc =~ /^[es]/) {
        my $b1 = $bstart ? 'begin' : $bend ? 'end' : 'continue';
        $beamx = qq(        <beam number="1">$b1</beam>\n);
        if ($dc eq 's') { my $ps_ = $k > 0 && $t[$k-1] =~ /:s\]?$/; my $ns = $k < $#t && $t[$k+1] =~ /:s\]?$/; $beamx .= qq(        <beam number="2">) . (!$ps_ ? 'begin' : !$ns ? 'end' : 'continue') . "</beam>\n" }
      }
      $beam = 0 if $bend;
      if ($ps =~ /^[rR]$/) {
        my $po = $ps eq 'r' ? ' print-object="no"' : '';
        $x .= qq(      <note$po>\n        <rest/>\n        <duration>$dur</duration>\n        <voice>$voice</voice>\n        <type>$type</type>\n) . ($dot ? "        <dot/>\n" : '') . $tm . qq(        <staff>$v->{st}</staff>\n) . ($tupst ? qq(        <notations>\n          <tuplet type="$tupst" bracket="yes"/>\n        </notations>\n) : '') . "      </note>\n";
      } else {
        my @p = split /\+/, $ps;
        for my $j (0 .. $#p) {
          my ($stop, $st, $ac, $oc, $start) = $p[$j] =~ /^(~?)([A-G])(bb|b|x|#)?(\d)(-?)$/ or die "altura? $p[$j] em $tok (compasso $m->{num})";
          $ac //= ''; my $alt = $ALT{$ac};
          $x .= "      <note>\n" . ($j ? "        <chord/>\n" : '') . "        <pitch>\n          <step>$st</step>\n" . ($alt ? "          <alter>$alt</alter>\n" : '') . "          <octave>$oc</octave>\n        </pitch>\n        <duration>$dur</duration>\n";
          $x .= qq(        <tie type="stop"/>\n) if $stop; $x .= qq(        <tie type="start"/>\n) if $start;
          $x .= "        <voice>$voice</voice>\n        <type>$type</type>\n" . ($dot ? "        <dot/>\n" : '') . $tm . "        <staff>$v->{st}</staff>\n" . ($j ? '' : $beamx);
          my $nt = ''; $nt .= qq(          <tied type="stop"/>\n) if $stop; $nt .= qq(          <tied type="start"/>\n) if $start; $nt .= qq(          <tuplet type="$tupst" bracket="yes"/>\n) if $tupst && !$j;
          $x .= "        <notations>\n$nt        </notations>\n" if $nt;
          $x .= "      </note>\n";
        }
      }
      $pos += $dur;
    }
    if ($pos < $m->{len}) { my $f = $m->{len} - $pos; $x .= "      <forward>\n        <duration>$f</duration>\n        <voice>$voice</voice>\n        <staff>$v->{st}</staff>\n      </forward>\n"; $pos = $m->{len} }
  }
  $x .= qq(      <barline location="right">\n        <bar-style>light-heavy</bar-style>\n      </barline>\n) if $i == $#med;
  $x .= "    </measure>\n";
  $prevcad = $cad; $first = 0;
}
$x .= "  </part>\n</score-partwise>\n";
print $x;
