/* Educational silhouettes, not production frame dimensions or a sizing tool. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.CyclifyRideModel = model;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  const styles = {
    endurance: { label: 'Endurance', title: 'Go further. Settle into the ride.', terrain: 'Long days · Paved roads',
      description: 'A taller front end and a less stretched position put long-ride comfort first. Still a road bike, still ready to move.',
      features: ['Raised cockpit', 'Balanced road handling', 'All-day position'], shop: 'road-bikes-india.html', shopLabel: 'Explore road bikes',
      geometry: { rear: 212, front: 671, axle: 302, radius: 119, bx: 397, by: 329, sx: 347, sy: 164, hx: 591, hy: 151, lx: 611, ly: 211, saddle: 111, stem: 42, tyre: 9, rim: 9, tube: 14, drop: 1, suspension: 0, tread: 0 } },
    gravel: { label: 'Gravel', title: 'Take the road less paved.', terrain: 'Mixed surfaces · New routes',
      description: 'Roomier tyres and a more settled stance for tarmac-to-dirt adventures. Gravel race and adventure bikes can have very different fits.',
      features: ['Wider tyre clearance', 'Mixed-surface control', 'Adventure-ready stance'], shop: 'index.html?search=gravel', shopLabel: 'Explore gravel products',
      geometry: { rear: 198, front: 687, axle: 298, radius: 123, bx: 395, by: 329, sx: 344, sy: 170, hx: 595, hy: 146, lx: 618, ly: 210, saddle: 109, stem: 33, tyre: 15, rim: 8, tube: 15, drop: 1, suspension: 0, tread: 1 } },
    aero: { label: 'Aero / Race', title: 'Find your fast line.', terrain: 'Fast road rides · Race days',
      description: 'A lower cockpit, shaped frame tubes and deep rims give this concept its race character. Your position matters as much as the bike.',
      features: ['Lower cockpit', 'Aero-shaped tubes', 'Deep-section wheels'], shop: 'road-bikes-india.html', shopLabel: 'Explore road bikes',
      geometry: { rear: 219, front: 672, axle: 302, radius: 119, bx: 402, by: 329, sx: 351, sy: 165, hx: 607, hy: 181, lx: 623, ly: 226, saddle: 109, stem: 48, tyre: 8, rim: 23, tube: 23, drop: 1, suspension: 0, tread: 0 } },
    mtb: { label: 'MTB', title: 'Make room for the trail.', terrain: 'Trails · Uneven ground',
      description: 'A hardtail concept with a suspension fork, flat bar and grippy tyres. The longer front end gives more room to move over the bike.',
      features: ['Suspension fork', 'Knobbly tyres', 'Slacker front end'], shop: 'mountain-bikes-india.html', shopLabel: 'Explore mountain bikes',
      geometry: { rear: 185, front: 712, axle: 289, radius: 132, bx: 394, by: 310, sx: 354, sy: 203, hx: 599, hy: 140, lx: 625, ly: 193, saddle: 112, stem: 23, tyre: 21, rim: 8, tube: 18, drop: 0, suspension: 1, tread: 1 } }
  };
  const colours = [
    { name: 'Racing green', value: '#17634f', light: '#8dbfad', dark: '#083e31' },
    { name: 'Burnt orange', value: '#e46432', light: '#ffc7a1', dark: '#8e2c18' },
    { name: 'Liquid silver', value: '#9caaa9', light: '#f7faf9', dark: '#405859' },
    { name: 'Cobalt blue', value: '#3767b5', light: '#b0d2fa', dark: '#162e63' }
  ];
  const metrics = {
    stack: { label: 'Stack', title: 'How high the frame meets the cockpit.', text: 'Vertical distance from the bottom bracket to the top of the head tube. More stack generally makes a higher bar position possible; spacers and the cockpit still affect fit.', tips: { endurance: 'Notice the taller front end compared with Aero / Race.', gravel: 'Adventure and gravel race bikes do not share one universal stack.', aero: 'A lower front end can support a lower torso position, if it suits your fit.', mtb: 'Bar rise and suspension setup also affect your standing position.' } },
    reach: { label: 'Reach', title: 'The frame’s horizontal length in front of you.', text: 'Horizontal distance from the bottom bracket to the top of the head tube. It is not saddle-to-handlebar distance: stem length, bars and saddle position matter too.', tips: { endurance: 'A less stretched cockpit is a common endurance priority.', gravel: 'A longer frame may be paired with a shorter stem.', aero: 'Do not choose extra reach just to look more aerodynamic.', mtb: 'Reach is especially useful for comparing room when standing on the pedals.' } },
    steering: { label: 'Head angle', title: 'One part of how the bike steers.', text: 'The steering-axis angle to the ground. A slacker angle often favours composure; a steeper angle often feels quicker. Fork offset, tyre size and trail also influence steering.', tips: { endurance: 'Road handling can be responsive without a very low riding position.', gravel: 'A more relaxed front end can help on loose surfaces.', aero: 'Aero tube shapes do not dictate a single steering angle.', mtb: 'Trail, cross-country and downhill bikes use different steering geometries.' } },
    wheelbase: { label: 'Wheelbase', title: 'The distance between the two wheel axles.', text: 'A longer wheelbase generally favours stability; a shorter one can feel more agile. Compare within a similar frame size and riding category.', tips: { endurance: 'A settled stance is useful on long road rides.', gravel: 'Extra length can bring composure on uneven surfaces.', aero: 'Race bikes balance fast handling with stability.', mtb: 'A longer front end gives room to move, but asks more in tight turns.' } },
    seat: { label: 'Seat angle', title: 'Where the saddle sits relative to the pedals.', text: 'Seat-tube angle helps place your seated weight over the bottom bracket. A steeper effective angle can move you forward; saddle height and rail adjustment change the result.', tips: { endurance: 'Set saddle position for your fit, not to compensate for the wrong frame.', gravel: 'Loaded riding and terrain change what feels comfortable.', aero: 'A road race position is not the same as a time-trial position.', mtb: 'Steeper effective seat angles can help centre your weight on climbs.' } },
    clearance: { label: 'Tyre space', title: 'More than the tyre width on the sidewall.', text: 'Frame and fork clearance limit tyre size. Actual width depends on the rim, and mud needs room too. Follow the frame, rim and tyre makers’ compatibility limits.', tips: { endurance: 'Wider road tyres can offer more comfort when correctly matched.', gravel: 'Clearance is a key difference between road and gravel designs.', aero: 'Deeper rims affect aerodynamics, not the frame’s tyre clearance.', mtb: 'Knobbly tyres and suspension suit rough ground; they do not make every trail safe.' } }
  };
  const n = value => Math.round(value * 100) / 100;
  function parts(g) {
    const { rear: r, front: f, axle: y, radius, bx, by, sx, sy, hx, hy, lx, ly } = g;
    const seatX = bx + (sx - bx) * (by - g.saddle) / (by - sy);
    const steererX = hx - (lx - hx) * 16 / (ly - hy);
    const barX = steererX + g.stem;
    const barY = hy - 16;
    const midpoint = (a,b,t) => a + (b-a)*t;
    return {
      'rear-wheel': { transform: `translate(${n(r)} ${n(y)}) scale(${n(radius/120)})` },
      'front-wheel': { transform: `translate(${n(f)} ${n(y)}) scale(${n(radius/120)})` },
      'rear-stays': { d: `M${sx} ${sy+10} L${r} ${y} L${bx} ${by}`, 'stroke-width': g.tube * .38 },
      'frame-main': { d: `M${bx} ${by} L${sx} ${sy} L${hx} ${hy+6} L${lx} ${ly} Z`, 'stroke-width': g.tube },
      'frame-highlight': { d: `M${bx-2} ${by-5} L${sx-2} ${sy-2} L${hx-2} ${hy+3}`, 'stroke-width': Math.max(1.4,g.tube*.13) },
      'downtube': { d: `M${bx} ${by} L${lx} ${ly}`, 'stroke-width': g.tube*1.42 },
      'downtube-light': { d: `M${bx+4} ${by-6} L${lx-1} ${ly-5}`, 'stroke-width': g.tube*.12 },
      'fork': { d: `M${lx} ${ly-3} Q${lx+13} ${ly+43} ${f} ${y}`, 'stroke-width': 11 + 5*g.suspension },
      'stanchion': { d: `M${lx+3} ${ly+6} L${midpoint(lx,f,.46)} ${midpoint(ly,y,.46)}`, opacity: g.suspension },
      'fork-crown': { d: `M${lx-6} ${ly+8} L${lx+9} ${ly+1}`, opacity: g.suspension },
      'seatpost': { d: `M${sx} ${sy} L${seatX} ${g.saddle+9}` },
      'saddle': { transform: `translate(${n(seatX)} ${n(g.saddle)})` },
      'stem': { d: `M${hx} ${hy+4} L${steererX} ${barY} L${barX} ${barY-2}` },
      'dropbar': { d: `M${barX-5} ${barY-2} C${barX+46} ${barY-13} ${barX+45} ${barY+42} ${barX+21} ${barY+45} L${barX+10} ${barY+45}`, opacity: g.drop },
      'hood': { d: `M${barX+24} ${barY+3} L${barX+31} ${barY-9} L${barX+35} ${barY-7} L${barX+33} ${barY+15}`, opacity: g.drop },
      'flatbar': { d: `M${barX-29} ${barY-9} L${barX-8} ${barY-2} L${barX+26} ${barY-9} L${barX+47} ${barY-10}`, opacity: 1-g.drop },
      'grip': { d: `M${barX+28} ${barY-9} L${barX+49} ${barY-10} M${barX-30} ${barY-9} L${barX-17} ${barY-5}`, opacity: 1-g.drop },
      'chain': { d: `M${r} ${y-12} L${bx+2} ${by-27} A27 27 0 1 1 ${bx-1} ${by+27} L${r-7} ${y+12} A13 13 0 0 1 ${r} ${y-12} Z` },
      'crank': { transform: `translate(${n(bx)} ${n(by)})` },
      'cassette': { transform: `translate(${n(r)} ${n(y)})` },
      'derailleur': { d: `M${r+9} ${y+4} L${r+22} ${y+29} L${r+8} ${y+44} L${r-2} ${y+20}` },
      'brand': { transform: `translate(${n((bx+lx)/2)} ${n((by+ly)/2)}) rotate(${n(Math.atan2(ly-by,lx-bx)*180/Math.PI)})` },
      'bottle-mounts': { d: `M${bx+34} ${by-31} l3 -2 M${bx+56} ${by-43} l3 -2`, opacity: 1-g.suspension*.5 },
      'geo-stack': { d: `M${bx} ${by} H${hx+62} M${hx} ${hy} H${hx+62} M${hx+52} ${hy} V${by} M${hx+47} ${hy+6} l5 -6 5 6 M${hx+47} ${by-6} l5 6 5 -6` },
      'geo-reach': { d: `M${bx} ${by} V72 M${hx} ${hy} V72 M${bx} 82 H${hx} M${bx+6} 77 l-6 5 6 5 M${hx-6} 77 l6 5 -6 5` },
      'geo-steering': { d: `M${hx-(lx-hx)*.6} ${hy-(ly-hy)*.6} L${hx+(lx-hx)*(421-hy)/(ly-hy)} 421 H${f-100} M${hx+(lx-hx)*(421-hy)/(ly-hy)-43} 421 a43 43 0 0 1 ${43-43*(lx-hx)/Math.hypot(lx-hx,ly-hy)} ${-43*(ly-hy)/Math.hypot(lx-hx,ly-hy)}` },
      'geo-wheelbase': { d: `M${r} ${y} V452 M${f} ${y} V452 M${r} 442 H${f} M${r+6} 437 l-6 5 6 5 M${f-6} 437 l6 5 -6 5` },
      'geo-seat': { d: `M${seatX} ${g.saddle} L${bx} ${by} H${bx-90} M${bx-48} ${by} A48 48 0 0 1 ${bx+(sx-bx)*48/Math.hypot(sx-bx,sy-by)} ${by+(sy-by)*48/Math.hypot(sx-bx,sy-by)}` },
      'geo-clearance': { cx: f, cy: y-radius+3, r: 29 },
      'geo-stack-label': { x: hx+69, y: (hy+by)/2 },
      'geo-reach-label': { x: (hx+bx)/2, y: 66 },
      'geo-steering-label': { x: f+30, y: 413 },
      'geo-wheelbase-label': { x: (r+f)/2, y: 468 },
      'geo-seat-label': { x: bx-92, y: by-48 },
      'geo-clearance-label': { x: f+40, y: y-radius+4 }
    };
  }
  return { styles, colours, metrics, parts };
});
