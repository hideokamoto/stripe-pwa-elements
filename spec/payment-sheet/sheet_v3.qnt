// stripe-payment-sheet 仕様 v3（v2 に Checkout Session を追加したもの）
// v2 からの変更点:
//  - secret は2つの属性から来る: intent-client-secret と checkout-session-client-secret
//  - 両方が設定されていたら checkout-session-client-secret を使う（stripe-payment-element と同じ）
//  - Checkout Session の secret は形式を見ない（Stripe が形式を公開していないため）。確定は checkout の confirm を使う
//  - 性質4 を「属性から決まる確定メソッドだけを呼ぶ」に強めた
//  - 到達可能性の確認 checkoutNeverCompleted を追加（違反すれば Checkout Session でも完了できる）
//  - 属性は値（同じ種類の別の secret を含む）で持つ。使われる secret が変わらない変更（使われない側の属性だけの変更）は何もしない
//  - 性質6 ignoredChangeIsNoop を追加
// v2 の変更点（v1 から）:
//  - intent-type を廃止。intent の確定メソッドは secret のプレフィックスから決める（pi_ / seti_ 以外は読み込み失敗）
//  - present() は Promise を1つしか持たない。表示中・確定処理中に呼ばれたら同じ Promise を返す
//  - 読み込み中の present() は、読み込み成功で表示し、失敗なら Failed で解決する
//  - 表示できない状態（LoadFailed / Completed / Errored）の present() は即座に Failed で解決する
//  - 確定処理中は secret の変更を保留する（モデルでは確定処理中の変更を不可とする）
//  - 表示中に secret が変わったら、Canceled で解決して閉じてから読み込み直す
//  - 再入力できないエラー（intent が使えない状態など）で Failed を発火して Errored に移る
module sheet_v3 {
  type Phase = Idle | Loading | Ready | LoadFailed | Presented | Confirming | Completed | Errored

  type Confirm = { gen: int, method: str, kind: str }

  pure val MAX_GEN = 3

  // intent-client-secret に設定できる値（"none" は未設定。pi / pi2 は別々の PaymentIntent の secret）
  pure val INTENT_ATTRS = Set("none", "pi", "pi2", "seti", "other")
  // checkout-session-client-secret に設定できる値（"none" は未設定。cs / cs2 は別々の Checkout Session の secret）
  pure val CHECKOUT_ATTRS = Set("none", "cs", "cs2")

  var phase: Phase
  var gen: int
  var secretKind: str          // "none" | "pi" | "seti" | "other" | "cs"（cs = Checkout Session）
  var intentAttr: str          // intent-client-secret の値（INTENT_ATTRS）
  var checkoutAttr: str        // checkout-session-client-secret の値（CHECKOUT_ATTRS）
  var inits: Set[int]
  var confirms: Set[Confirm]
  var pending: bool            // 未解決の present() Promise があるか（常に最大1つ）
  var wantOpen: bool           // 読み込み完了後に表示する予約
  var created: int             // 作られた Promise の数
  var resolved: int            // 解決された Promise の数
  var stripeSucceeded: int
  var completedEmitted: int
  var canceledEmitted: int
  var failedEmitted: int
  var mismatchConfirm: bool
  var canceledAfterCompleted: bool
  var completedGen: int        // 完了した決済の世代（未完了なら -1）
  var checkoutCompleted: bool  // Checkout Session の確定が完了したことがあるか
  var ignoredChangeDisturbed: bool // checkout-session-client-secret を保ったまま intent 側だけ変えたときに、読み込み直し・キャンセルが起きたか

  // intent の値から種類を決める（プレフィックスに相当）
  pure def intentKind(intent: str): str = if (intent == "pi2") "pi" else intent

  // 両方の属性から使う secret を決める。checkout-session-client-secret が優先
  pure def effectiveSecret(intent: str, checkout: str): str = if (checkout != "none") checkout else intent

  // 両方の属性から secret の種類を決める
  pure def kindOf(intent: str, checkout: str): str = if (checkout != "none") "cs" else intentKind(intent)

  // 実装が secret の種類から選ぶ確定メソッド
  pure def methodOf(k: str): str =
    if (k == "pi") "payment" else if (k == "seti") "setup" else if (k == "cs") "checkout" else "none"

  // 属性だけから決まる正しい確定メソッド（kindOf / methodOf とは独立に書く）
  pure def expectedMethod(intent: str, checkout: str): str =
    if (checkout != "none") "checkout" else if (intent == "pi" or intent == "pi2") "payment" else if (intent == "seti") "setup" else "none"

  // Stripe 側で成功しうる組み合わせ
  pure def stripeAccepts(method: str, k: str): bool =
    (method == "payment" and k == "pi") or (method == "setup" and k == "seti") or (method == "checkout" and k == "cs")

  // 読み込みに進める secret の種類（intent のプレフィックスが不明なものだけが読み込み失敗）
  pure def loadable(k: str): bool = k == "pi" or k == "seti" or k == "cs"

  action init = all {
    phase' = Idle, gen' = 0, secretKind' = "none", intentAttr' = "none", checkoutAttr' = "none",
    inits' = Set(), confirms' = Set(),
    pending' = false, wantOpen' = false, created' = 0, resolved' = 0,
    stripeSucceeded' = 0, completedEmitted' = 0, canceledEmitted' = 0, failedEmitted' = 0,
    mismatchConfirm' = false, canceledAfterCompleted' = false, completedGen' = -1, checkoutCompleted' = false,
    ignoredChangeDisturbed' = false,
  }

  action unchangedCounters = all {
    stripeSucceeded' = stripeSucceeded, completedEmitted' = completedEmitted,
    mismatchConfirm' = mismatchConfirm, checkoutCompleted' = checkoutCompleted,
    ignoredChangeDisturbed' = ignoredChangeDisturbed,
  }

  action unchangedAttrs = all { intentAttr' = intentAttr, checkoutAttr' = checkoutAttr }

  // secret の設定・変更（どちらか一方、または両方の属性）。確定処理中は受け付けない（実装では確定完了まで保留）
  // 使う secret が変わらなければ属性の値だけが変わり、読み込み直しもキャンセルも起きない
  action setSecret = {
    nondet ia = INTENT_ATTRS.oneOf()
    nondet ca = CHECKOUT_ATTRS.oneOf()
    val changed = effectiveSecret(ia, ca) != effectiveSecret(intentAttr, checkoutAttr)
    val wasPresented = phase == Presented
    val cancels = changed and wasPresented
    // 使われない側（checkout-session-client-secret があるときの intent-client-secret）だけの変更か。effectiveSecret とは独立に書く
    val ignoredOnly = checkoutAttr != "none" and ca == checkoutAttr
    all {
      gen < MAX_GEN,
      phase != Confirming,
      ia != "none" or ca != "none",
      intentAttr' = ia, checkoutAttr' = ca,
      gen' = if (changed) gen + 1 else gen,
      secretKind' = if (changed) kindOf(ia, ca) else secretKind,
      inits' = if (changed) inits.union(Set(gen + 1)) else inits,
      phase' = if (changed) Loading else phase,
      confirms' = confirms,
      // 表示中なら Canceled で解決して閉じる
      pending' = if (cancels) false else pending,
      resolved' = if (cancels and pending) resolved + 1 else resolved,
      canceledEmitted' = if (cancels) canceledEmitted + 1 else canceledEmitted,
      canceledAfterCompleted' = (canceledAfterCompleted or (cancels and completedGen == gen)),
      completedGen' = completedGen,
      wantOpen' = if (cancels) false else wantOpen,
      created' = created, failedEmitted' = failedEmitted,
      stripeSucceeded' = stripeSucceeded, completedEmitted' = completedEmitted,
      mismatchConfirm' = mismatchConfirm, checkoutCompleted' = checkoutCompleted,
      ignoredChangeDisturbed' = (ignoredChangeDisturbed or (ignoredOnly and (changed or cancels))),
    }
  }

  // 初期化の完了。intent の secret のプレフィックスが pi_ / seti_ 以外なら失敗扱い
  action loadResult = {
    nondet g = inits.oneOf()
    nondet ok0 = Set(true, false).oneOf()
    val ok = ok0 and loadable(secretKind)
    val current = g == gen and phase == Loading
    all {
      inits.size() > 0,
      inits' = inits.exclude(Set(g)),
      phase' = if (current) (if (ok) (if (wantOpen) Presented else Ready) else LoadFailed) else phase,
      wantOpen' = if (current) false else wantOpen,
      // 読み込み失敗で、表示を待っていた Promise は Failed で解決
      pending' = if (current and not(ok)) false else pending,
      resolved' = if (current and not(ok) and pending) resolved + 1 else resolved,
      failedEmitted' = failedEmitted,   // 読み込み失敗は paymentSheetFailedToLoad を発火し、Promise は Failed で解決する
      gen' = gen, secretKind' = secretKind, confirms' = confirms, created' = created,
      canceledEmitted' = canceledEmitted, canceledAfterCompleted' = canceledAfterCompleted, completedGen' = completedGen,
      unchangedCounters, unchangedAttrs,
    }
  }

  // present()
  action present = {
    val reuse = pending                                   // 既存の Promise を返す
    val terminal = phase == LoadFailed or phase == Completed or phase == Errored
    all {
      created' = if (reuse) created else created + 1,
      // 表示できない状態なら即座に Failed で解決
      pending' = if (reuse) true else not(terminal),
      resolved' = if (not(reuse) and terminal) resolved + 1 else resolved,
      failedEmitted' = failedEmitted,   // 表示できない状態の present() は Promise を Failed で解決するだけで、イベントは発火しない
      phase' = if (phase == Ready) Presented else phase,
      wantOpen' = if (phase == Idle or phase == Loading) true else wantOpen,
      gen' = gen, secretKind' = secretKind, inits' = inits, confirms' = confirms,
      canceledEmitted' = canceledEmitted, canceledAfterCompleted' = canceledAfterCompleted, completedGen' = completedGen,
      unchangedCounters, unchangedAttrs,
    }
  }

  // open 属性を true にする（Promise は作らない）
  action openAttr = all {
    phase == Ready, phase' = Presented,
    gen' = gen, secretKind' = secretKind, inits' = inits, confirms' = confirms, pending' = pending,
    wantOpen' = wantOpen, created' = created, resolved' = resolved, failedEmitted' = failedEmitted,
    canceledEmitted' = canceledEmitted, canceledAfterCompleted' = canceledAfterCompleted, completedGen' = completedGen,
    unchangedCounters, unchangedAttrs,
  }

  // 閉じる操作（閉じるボタン / 背景 / ESC / open=false）。確定処理中は不可
  action close = all {
    phase == Presented, phase' = Ready,
    pending' = false,
    resolved' = if (pending) resolved + 1 else resolved,
    canceledEmitted' = canceledEmitted + 1,
    canceledAfterCompleted' = (canceledAfterCompleted or completedGen == gen),
    completedGen' = completedGen,
    gen' = gen, secretKind' = secretKind, inits' = inits, confirms' = confirms,
    wantOpen' = wantOpen, created' = created, failedEmitted' = failedEmitted,
    unchangedCounters, unchangedAttrs,
  }

  // 送信。メソッドは secret の種類（属性、intent ならプレフィックス）から決まる
  action submit = all {
    phase == Presented, phase' = Confirming,
    confirms' = confirms.union(Set({ gen: gen, method: methodOf(secretKind), kind: secretKind })),
    mismatchConfirm' = (mismatchConfirm or methodOf(secretKind) != expectedMethod(intentAttr, checkoutAttr)),
    gen' = gen, secretKind' = secretKind, inits' = inits, pending' = pending, wantOpen' = wantOpen,
    created' = created, resolved' = resolved, failedEmitted' = failedEmitted,
    canceledEmitted' = canceledEmitted, canceledAfterCompleted' = canceledAfterCompleted, completedGen' = completedGen,
    stripeSucceeded' = stripeSucceeded, completedEmitted' = completedEmitted, checkoutCompleted' = checkoutCompleted,
    ignoredChangeDisturbed' = ignoredChangeDisturbed,
    unchangedAttrs,
  }

  // 確定結果: 成功 / 再入力できるエラー / 再入力できないエラー
  action confirmResult = {
    nondet c = confirms.oneOf()
    nondet outcome = Set("approved", "declined", "fatal").oneOf()
    val success = outcome == "approved" and stripeAccepts(c.method, c.kind)
    val fatal = outcome == "fatal"
    val current = phase == Confirming and c.gen == gen
    all {
      confirms.size() > 0,
      confirms' = confirms.exclude(Set(c)),
      stripeSucceeded' = if (success) stripeSucceeded + 1 else stripeSucceeded,
      phase' = if (current) (if (success) Completed else if (fatal) Errored else Presented) else phase,
      completedEmitted' = if (current and success) completedEmitted + 1 else completedEmitted,
      failedEmitted' = if (current and fatal and not(success)) failedEmitted + 1 else failedEmitted,
      pending' = if (current and (success or fatal)) false else pending,
      resolved' = if (current and (success or fatal) and pending) resolved + 1 else resolved,
      gen' = gen, secretKind' = secretKind, inits' = inits, wantOpen' = wantOpen, created' = created,
      canceledEmitted' = canceledEmitted, canceledAfterCompleted' = canceledAfterCompleted,
      completedGen' = if (current and success) gen else completedGen,
      mismatchConfirm' = mismatchConfirm,
      checkoutCompleted' = (checkoutCompleted or (current and success and c.kind == "cs")),
      ignoredChangeDisturbed' = ignoredChangeDisturbed,
      unchangedAttrs,
    }
  }

  action step = any { setSecret, loadResult, present, openAttr, close, submit, confirmResult }

  // ---- 守るべき性質 ----
  // 性質1: present() の Promise は解決手段を失わない（作成数 = 解決数 + 未解決の1つ以下）
  val noOrphanPromise = created == resolved + (if (pending) 1 else 0)
  // 性質2: 未解決の Promise があるなら、表示中・確定処理中・表示予約付きの読み込み中のどれか
  val pendingImpliesProgress =
    pending implies (phase == Presented or phase == Confirming or ((phase == Loading or phase == Idle) and wantOpen))
  // 性質3: Stripe 側で成功した確定は必ず Completed として通知される
  val successIsReported = stripeSucceeded == completedEmitted
  // 性質4: 属性から決まる確定メソッドだけを呼ぶ（checkout-session-client-secret があれば checkout、なければプレフィックス）
  val methodMatchesSecret = not(mismatchConfirm)
  // 性質5: 同じ決済（同じ世代）の中で、完了後に Canceled を発火しない
  val noCancelAfterComplete = not(canceledAfterCompleted)
  // 性質6: 使われない側の属性（checkout-session-client-secret があるときの intent-client-secret）だけを変えても、読み込み直さず、開いているシートも閉じない
  val ignoredChangeIsNoop = not(ignoredChangeDisturbed)
  // 到達可能性の確認用（違反が見つかれば Failed は到達可能）
  val failedNeverEmitted = failedEmitted == 0
  // 到達可能性の確認用（違反が見つかれば Checkout Session でも完了できる）
  val checkoutNeverCompleted = not(checkoutCompleted)
  val allProps = noOrphanPromise and pendingImpliesProgress and successIsReported and methodMatchesSecret and noCancelAfterComplete and ignoredChangeIsNoop
}
