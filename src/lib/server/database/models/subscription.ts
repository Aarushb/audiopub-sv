import { AllowNull, BelongsTo, Column, DataType, Default, ForeignKey, Index, Model, PrimaryKey, Table, Unique } from "sequelize-typescript";
import User from "./user";

@Table
export default class Subscription extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id: string;

    @AllowNull(false)
    @Unique("unique_subscriber_follows_subscribed_to_user")
    @ForeignKey(() => User)
    @Index
    @Column(DataType.UUID)
    declare subscriberId: string;

    @BelongsTo(() => User, { foreignKey: "subscriberId", onDelete: "CASCADE" })
    declare subscriber?: User;

    @AllowNull(false)
    @Unique("unique_subscriber_follows_subscribed_to_user")
    @ForeignKey(() => User)
    @Index
    @Column(DataType.UUID)
    declare subscribedToId: string;

    @BelongsTo(() => User, { foreignKey: "subscribedToId", onDelete: "CASCADE" })
    declare subscribedTo?: User;
}
